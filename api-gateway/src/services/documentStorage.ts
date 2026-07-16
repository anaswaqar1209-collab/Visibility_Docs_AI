import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Document, { IDocument } from '../models/Document';
import DocumentChunk from '../models/DocumentChunk';
import { isAllowedFile, sanitizeFilename } from '../utils/fileValidation';
import { AuthUser } from './accessScope';
import {
    AiUploadResult,
    deleteDocumentFromAi,
    isAiServiceEnabled,
    resolveAiOrganizationId,
    uploadDocumentToAi,
} from './aiServiceClient';
import logger from '../utils/logger';

const VM_MAIN_ROOT = path.resolve(process.cwd(), '..');

/** Shared folder used by Node api-gateway and Python ai-backend */
export const UPLOAD_ROOT = process.env.SHARED_STORAGE_PATH
    ? path.resolve(process.env.SHARED_STORAGE_PATH)
    : path.join(VM_MAIN_ROOT, 'shared-storage');

export function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_ROOT)) {
        fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
}

export function getDocumentDir(orgFolder: string, documentId: string) {
    return path.join(UPLOAD_ROOT, 'orgs', orgFolder, 'documents', documentId);
}

export function deleteDocumentFolder(storagePath: string) {
    const dir = path.dirname(storagePath);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export async function deleteDocumentFully(
    documentId: string,
    storagePath: string,
    options?: { pythonDocumentId?: string | null; aiOrgId?: string }
) {
    if (options?.pythonDocumentId && options.aiOrgId && isAiServiceEnabled()) {
        try {
            await deleteDocumentFromAi(options.pythonDocumentId, options.aiOrgId);
        } catch (e: any) {
            logger.warn(`AI delete failed for ${documentId}: ${e.message}`);
        }
    }
    deleteDocumentFolder(storagePath);
    await DocumentChunk.deleteMany({ documentId });
    await Document.deleteOne({ documentId });
}

export interface UploadFileInput {
    path: string;
    originalname: string;
    mimetype: string;
    size: number;
}

export type SaveUploadResult = {
    doc: IDocument;
    aiModelResponse: AiUploadResult | null;
};

export async function saveUploadedFile(user: AuthUser, file: UploadFileInput, phase3Agent?: string): Promise<SaveUploadResult> {
    const validation = isAllowedFile(file.originalname, file.mimetype);
    if (!validation.ok) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw Object.assign(new Error(validation.reason), { statusCode: 415 });
    }

    const documentId = `doc_${uuidv4()}`;
    const orgFolder = user.organizationId || `personal_${user.userId}`;
    const destDir = getDocumentDir(orgFolder, documentId);
    fs.mkdirSync(destDir, { recursive: true });

    const storedFilename = sanitizeFilename(file.originalname);
    const storagePath = path.join(destDir, storedFilename);
    fs.renameSync(file.path, storagePath);

    const contentHash = crypto.createHash('sha256').update(fs.readFileSync(storagePath)).digest('hex');

    const existingDup = await Document.findOne({
        uploadedBy: user.userId,
        contentHash,
        pythonDocumentId: { $exists: true, $ne: null },
    }).lean();

    if (existingDup) {
        deleteDocumentFolder(storagePath);
        throw Object.assign(
            new Error(
                `This file was already uploaded as "${existingDup.originalFilename}". Delete the existing copy first or upload a different file.`
            ),
            { statusCode: 409 }
        );
    }

    let pythonDocumentId: string | null = null;
    let aiProcessingStatus: string | null = null;
    let aiErrorMessage: string | null = null;
    let status: 'uploaded' | 'processing' | 'failed' = 'uploaded';
    let aiModelResponse: AiUploadResult | null = null;
    let aiOrgId: string | null = null;

    if (isAiServiceEnabled()) {
        try {
            aiOrgId = resolveAiOrganizationId(user);
            const aiResult = await uploadDocumentToAi({
                filePath: storagePath,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                organizationId: aiOrgId,
                title: file.originalname,
                phase3Agent: phase3Agent || undefined,
                uploadedBy: user.userId,
            });
            pythonDocumentId = aiResult.id;
            aiProcessingStatus = aiResult.status;
            status = 'processing';
            aiModelResponse = aiResult;
        } catch (e: any) {
            aiErrorMessage = e.message || 'AI upload failed';
            status = 'failed';
            logger.warn(`AI forward failed for ${documentId}: ${aiErrorMessage}`);
        }
    }

    const doc = await Document.create({
        documentId,
        organizationId: user.organizationId || null,
        uploadedBy: user.userId,
        openRemoteUserId: (user as any).openRemoteUserId || null,
        originalFilename: file.originalname,
        storedFilename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        contentHash,
        pythonDocumentId,
        aiProcessingStatus,
        aiErrorMessage,
        status,
        classification: null,
        metadata: {
            source: 'web_upload',
            aiSynced: !!pythonDocumentId,
            ...(phase3Agent ? { phase3Agent } : {}),
            ...(pythonDocumentId && aiOrgId ? { aiOrgId } : {}),
        },
    });

    return { doc, aiModelResponse };
}
