import mongoose, { Document, Schema } from 'mongoose';

export type DocumentShareScope = 'user' | 'department';

export interface IDocumentShare extends Document {
    shareId: string;
    documentId: string;
    sharedBy: string;
    organizationId: string;
    scope: DocumentShareScope;
    /** When scope=user: specific users who may see the leader doc */
    targetUserIds: string[];
    /** When scope=department: whole department may see it */
    departmentId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const DocumentShareSchema = new Schema<IDocumentShare>(
    {
        shareId: { type: String, required: true, unique: true, index: true },
        documentId: { type: String, required: true, index: true },
        sharedBy: { type: String, required: true, index: true },
        organizationId: { type: String, required: true, index: true },
        scope: { type: String, enum: ['user', 'department'], required: true },
        targetUserIds: { type: [String], default: [] },
        departmentId: { type: String, default: null },
    },
    { timestamps: true }
);

DocumentShareSchema.index({ documentId: 1, sharedBy: 1 });

export default mongoose.model<IDocumentShare>('DocumentShare', DocumentShareSchema);
