import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Organization from '../models/Organization';
import Document from '../models/Document';
import {
    annotateDuplicateCounts,
    getDuplicateDocumentIds,
    getDuplicateGroupSizes,
} from '../services/duplicateDetection';

export const listAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('-passwordHash -openRemoteSecret')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: { admins } });
    } catch (error) {
        next(error);
    }
};

export const updateAdminStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.params.userId === req.user.userId) {
            return res.status(400).json({ success: false, message: 'Cannot change your own status' });
        }
        const { status } = req.body;
        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be active or blocked' });
        }
        const admin = await User.findOneAndUpdate(
            { userId: req.params.userId, role: 'admin' },
            { status },
            { new: true }
        ).select('-passwordHash -openRemoteSecret');
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        res.json({ success: true, data: { admin } });
    } catch (error) {
        next(error);
    }
};

export const updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admin = await User.findOne({ userId: req.params.userId, role: 'admin' });
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

        const { fullName, email, contactNumber } = req.body;
        if (fullName) admin.fullName = fullName;
        if (contactNumber !== undefined) admin.contactNumber = contactNumber;
        if (email) {
            const normalized = email.toString().trim().toLowerCase();
            const dup = await User.findOne({ email: normalized, userId: { $ne: admin.userId } });
            if (dup) return res.status(409).json({ success: false, message: 'Email already in use' });
            admin.email = normalized;
        }
        await admin.save();
        res.json({ success: true, data: { admin: await User.findById(admin._id).select('-passwordHash -openRemoteSecret').lean() } });
    } catch (error) {
        next(error);
    }
};

export const deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.params.userId === req.user.userId) {
            return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
        }
        const result = await User.deleteOne({ userId: req.params.userId, role: 'admin' });
        if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Admin not found' });
        res.json({ success: true, message: 'Admin deleted' });
    } catch (error) {
        next(error);
    }
};

export const listOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: { organizations: orgs } });
    } catch (error) {
        next(error);
    }
};

export const listAllDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
        const q = ((req.query.q as string) || '').trim();
        const mimeType = (req.query.mimeType as string) || '';
        const duplicatesOnly = (req.query.duplicatesOnly as string) === 'true';
        const filter: Record<string, unknown> = {};
        if (req.query.organizationId) filter.organizationId = req.query.organizationId;
        if (mimeType) {
            filter.mimeType = new RegExp(mimeType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        if (q) {
            filter.$or = [
                { originalFilename: { $regex: q, $options: 'i' } },
                { documentId: { $regex: q, $options: 'i' } },
            ];
        }

        let queryFilter = filter;
        if (duplicatesOnly) {
            const duplicateIds = await getDuplicateDocumentIds(filter);
            if (!duplicateIds.length) {
                return res.json({
                    success: true,
                    data: {
                        documents: [],
                        pagination: { page: 1, limit, total: 0, totalPages: 0 },
                    },
                });
            }
            queryFilter = { ...filter, documentId: { $in: duplicateIds } };
        }

        const [documents, total, duplicateSizes] = await Promise.all([
            Document.find(queryFilter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Document.countDocuments(queryFilter),
            getDuplicateGroupSizes(filter),
        ]);

        res.json({
            success: true,
            data: {
                documents: annotateDuplicateCounts(documents, duplicateSizes),
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const listAllTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const members = await User.find({ role: 'team' })
            .select('-passwordHash -openRemoteSecret')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: { members } });
    } catch (error) {
        next(error);
    }
};
