import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Organization from '../models/Organization';
import Document from '../models/Document';
import {
    annotateDuplicateCounts,
    getDuplicateDocumentIds,
    getDuplicateGroupSizes,
} from '../services/duplicateDetection';
import { recordActivityFromReq } from '../services/activityLog';

const SORT_FIELDS: Record<string, string> = {
    createdAt: 'createdAt',
    name: 'originalFilename',
    size: 'sizeBytes',
    status: 'status',
    score: 'metadata.cvScore',
};

export const listAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('-passwordHash -openRemoteSecret')
            .sort({ createdAt: -1 })
            .lean();

        const orgIds = [
            ...new Set(admins.map((a) => a.organizationId).filter(Boolean) as string[]),
        ];

        const [orgs, teamMembers] = await Promise.all([
            orgIds.length
                ? Organization.find({ organizationId: { $in: orgIds } }).lean()
                : Promise.resolve([]),
            orgIds.length
                ? User.find({
                      role: 'team',
                      organizationId: { $in: orgIds },
                  })
                      .select('-passwordHash -openRemoteSecret')
                      .sort({ fullName: 1 })
                      .lean()
                : Promise.resolve([]),
        ]);

        const orgMap = new Map(orgs.map((o) => [o.organizationId, o]));
        const membersByOrg = new Map<string, typeof teamMembers>();
        for (const m of teamMembers) {
            const key = m.organizationId || '';
            if (!key) continue;
            const list = membersByOrg.get(key) || [];
            list.push(m);
            membersByOrg.set(key, list);
        }

        const enriched = admins.map((admin) => {
            const org = admin.organizationId ? orgMap.get(admin.organizationId) : null;
            const members = admin.organizationId
                ? membersByOrg.get(admin.organizationId) || []
                : [];
            return {
                ...admin,
                organization: org
                    ? {
                          organizationId: org.organizationId,
                          organizationName: org.organizationName,
                          status: org.status,
                          subscriptionPlan: org.subscriptionPlan,
                          contactEmail: org.contactEmail,
                      }
                    : null,
                teamMembers: members,
                teamMemberCount: members.length,
            };
        });

        res.json({ success: true, data: { admins: enriched } });
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
        recordActivityFromReq(req, {
            action: 'admin.status',
            category: 'admin',
            resourceType: 'user',
            resourceId: admin.userId,
            message: `Set admin ${admin.email} status to ${status}`,
            metadata: { status },
        });
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
        recordActivityFromReq(req, {
            action: 'admin.delete',
            category: 'admin',
            resourceType: 'user',
            resourceId: String(req.params.userId),
            message: `Deleted admin ${req.params.userId}`,
        });
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
        const sortBy = SORT_FIELDS[(req.query.sortBy as string) || 'createdAt'] || 'createdAt';
        const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;
        const status = (req.query.status as string) || '';
        const mimeType = (req.query.mimeType as string) || '';
        const organizationId = (req.query.organizationId as string) || undefined;
        const duplicatesOnly = (req.query.duplicatesOnly as string) === 'true';
        const scoreFilter = ((req.query.scoreFilter as string) || '').trim();

        const filter: Record<string, unknown> = {};
        if (organizationId) filter.organizationId = organizationId;
        if (status) filter.status = status;
        if (mimeType) {
            filter.mimeType = new RegExp(mimeType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        if (q) {
            filter.$or = [
                { originalFilename: { $regex: q, $options: 'i' } },
                { classification: { $regex: q, $options: 'i' } },
                { documentId: { $regex: q, $options: 'i' } },
            ];
        }
        if (scoreFilter === 'high') {
            filter['metadata.cvScore'] = { $gte: 70 };
        } else if (scoreFilter === 'medium') {
            filter['metadata.cvScore'] = { $gte: 40, $lt: 70 };
        } else if (scoreFilter === 'low') {
            filter['metadata.cvScore'] = { $gte: 0, $lt: 40 };
        } else if (scoreFilter === 'scored') {
            filter['metadata.cvScore'] = { $exists: true, $ne: null };
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
            Document.find(queryFilter)
                .sort({ [sortBy]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
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
