import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Department from '../models/Department';
import OrgRole from '../models/OrgRole';
import DepartmentMember from '../models/DepartmentMember';
import Document from '../models/Document';
import DocumentShare from '../models/DocumentShare';
import User from '../models/User';
import { PERMISSIONS, ORG_ROLE_EDITABLE_PERMISSIONS } from '../types/permissions';
import { hasPermission, loadUserDeptContext, canAccessDocument } from '../services/accessScope';
import { KNOWN_DOCUMENT_TYPES, normalizeDocumentType } from '../services/documentStorage';
import { recordActivityFromReq } from '../services/activityLog';
import { ensureDefaultOrgRoles } from '../services/orgRoleSeed';

function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64) || `dept-${Date.now()}`;
}

function requireOrg(req: Request): string | null {
    if (req.user.role === 'superAdmin') {
        return (req.query.organizationId as string) || req.body?.organizationId || req.user.organizationId || null;
    }
    return req.user.organizationId || null;
}

function canManageDepartments(req: Request): boolean {
    return (
        req.user.role === 'superAdmin' ||
        req.user.role === 'admin' ||
        hasPermission(req.user, PERMISSIONS.DEPARTMENT_MANAGE)
    );
}

function canViewDepartments(req: Request): boolean {
    return (
        canManageDepartments(req) ||
        hasPermission(req.user, PERMISSIONS.DEPARTMENT_VIEW) ||
        req.user.role === 'admin' ||
        req.user.role === 'superAdmin'
    );
}

// ── Departments ──────────────────────────────────────────────

export const listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canViewDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        if (!orgId && req.user.role !== 'superAdmin') {
            return res.status(400).json({ success: false, message: 'organizationId required' });
        }

        const filter: Record<string, unknown> = { status: { $ne: 'inactive' } };
        if (orgId) filter.organizationId = orgId;

        // Non-admin team: only their department
        if (req.user.role === 'team' && !canManageDepartments(req)) {
            const ctx = await loadUserDeptContext(req.user);
            if (!ctx.departmentId) {
                return res.json({ success: true, data: { departments: [] } });
            }
            filter.departmentId = ctx.departmentId;
        }

        const departments = await Department.find(filter).sort({ name: 1 }).lean();
        const ids = departments.map((d) => d.departmentId);
        const memberCounts = await DepartmentMember.aggregate([
            { $match: { departmentId: { $in: ids } } },
            { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(memberCounts.map((m) => [m._id, m.count]));

        res.json({
            success: true,
            data: {
                departments: departments.map((d) => ({
                    ...d,
                    memberCount: countMap[d.departmentId] || 0,
                })),
                knownDocumentTypes: Array.from(KNOWN_DOCUMENT_TYPES),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'organizationId required' });
        }

        const { name, description, allowedDocumentTypes } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        await ensureDefaultOrgRoles(orgId);

        const departmentId = `dept_${uuidv4()}`;
        let slug = slugify(String(name));
        const existingSlug = await Department.findOne({ organizationId: orgId, slug });
        if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

        const types = Array.isArray(allowedDocumentTypes)
            ? allowedDocumentTypes.map((t: string) => normalizeDocumentType(t))
            : [];

        const dept = await Department.create({
            departmentId,
            organizationId: orgId,
            name: String(name).trim(),
            slug,
            description: description ? String(description) : '',
            allowedDocumentTypes: types,
            createdBy: req.user.userId,
        });

        recordActivityFromReq(req, {
            action: 'department.create',
            category: 'department',
            resourceType: 'department',
            resourceId: departmentId,
            message: `Created department ${dept.name}`,
        });

        res.status(201).json({ success: true, data: { department: dept } });
    } catch (error) {
        next(error);
    }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        const dept = await Department.findOne({ departmentId: req.params.id });
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
        if (orgId && dept.organizationId !== orgId && req.user.role !== 'superAdmin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { name, description, allowedDocumentTypes, status } = req.body || {};
        if (name) dept.name = String(name).trim();
        if (description !== undefined) dept.description = String(description);
        if (Array.isArray(allowedDocumentTypes)) {
            dept.allowedDocumentTypes = allowedDocumentTypes.map((t: string) => normalizeDocumentType(t));
        }
        if (status === 'active' || status === 'inactive') dept.status = status;
        await dept.save();

        res.json({ success: true, data: { department: dept } });
    } catch (error) {
        next(error);
    }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        const dept = await Department.findOne({ departmentId: req.params.id });
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
        if (orgId && dept.organizationId !== orgId && req.user.role !== 'superAdmin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await DepartmentMember.deleteMany({ departmentId: dept.departmentId });
        await User.updateMany(
            { primaryDepartmentId: dept.departmentId },
            { $set: { primaryDepartmentId: null, orgRoleId: null } }
        );
        await Document.updateMany(
            { departmentId: dept.departmentId },
            { $set: { departmentId: null, visibilityScope: 'personal', uploaderIsLeader: false } }
        );
        await Department.deleteOne({ departmentId: dept.departmentId });

        recordActivityFromReq(req, {
            action: 'department.delete',
            category: 'department',
            resourceType: 'department',
            resourceId: dept.departmentId,
            message: `Deleted department ${dept.name}`,
        });

        res.json({ success: true, message: 'Department deleted' });
    } catch (error) {
        next(error);
    }
};

export const getDepartmentOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canViewDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const dept = await Department.findOne({ departmentId: req.params.id }).lean();
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        if (req.user.role === 'team' && !canManageDepartments(req)) {
            const ctx = await loadUserDeptContext(req.user);
            if (ctx.departmentId !== dept.departmentId) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        } else if (
            req.user.role === 'admin' &&
            req.user.organizationId &&
            dept.organizationId !== req.user.organizationId
        ) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const members = await DepartmentMember.find({ departmentId: dept.departmentId }).lean();
        const userIds = members.map((m) => m.userId);
        const roleIds = [...new Set(members.map((m) => m.orgRoleId))];
        const [users, roles] = await Promise.all([
            User.find({ userId: { $in: userIds } }).select('-passwordHash -openRemoteSecret').lean(),
            OrgRole.find({ roleId: { $in: roleIds } }).lean(),
        ]);
        const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));
        const roleMap = Object.fromEntries(roles.map((r) => [r.roleId, r]));

        const classification = ((req.query.classification as string) || '').trim();
        const uploadedBy = ((req.query.uploadedBy as string) || '').trim();

        // Non-leaders shouldn't see unshared leader docs in overview either
        const ctx = await loadUserDeptContext(req.user);
        const isAdmin =
            req.user.role === 'superAdmin' ||
            (req.user.role === 'admin' && hasPermission(req.user, PERMISSIONS.ORG_DOCUMENTS_VIEW));

        // Build document filter: admins and leaders should also see documents uploaded by any member
        let docFilter: Record<string, unknown> = {
            departmentId: dept.departmentId,
            visibilityScope: 'department',
        };
        if (isAdmin || ctx.isLeader) {
            docFilter = {
                $or: [
                    { departmentId: dept.departmentId },
                    { uploadedBy: { $in: userIds } },
                ],
            };
        }
        if (classification) docFilter.classification = classification;
        if (uploadedBy) docFilter.uploadedBy = uploadedBy;

        let documents = await Document.find(docFilter).sort({ createdAt: -1 }).limit(200).lean();
        if (!isAdmin && !ctx.isLeader) {
            documents = documents.filter(
                (d) =>
                    !d.uploaderIsLeader ||
                    d.uploadedBy === req.user.userId ||
                    ctx.sharedDocumentIds.includes(d.documentId)
            );
        }

        const typeCounts: Record<string, number> = {};
        for (const d of documents) {
            const t = d.classification || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        }

        const memberRows = members.map((m) => {
            const role = roleMap[m.orgRoleId];
            return {
                ...m,
                user: userMap[m.userId] || null,
                role: role
                    ? { roleId: role.roleId, name: role.name, isLeader: role.isLeader }
                    : null,
            };
        });

        const leaders = memberRows.filter((m) => m.role?.isLeader);

        res.json({
            success: true,
            data: {
                department: dept,
                members: memberRows,
                leaders,
                documents,
                typeCounts,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── Members ──────────────────────────────────────────────────

export const addDepartmentMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const { userId, orgRoleId } = req.body || {};
        if (!userId || !orgRoleId) {
            return res.status(400).json({ success: false, message: 'userId and orgRoleId are required' });
        }

        const dept = await Department.findOne({ departmentId: req.params.id });
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.organizationId !== dept.organizationId) {
            return res.status(400).json({ success: false, message: 'User must belong to the same organization' });
        }

        const role = await OrgRole.findOne({ roleId: orgRoleId, organizationId: dept.organizationId });
        if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

        // v1: one department per user — remove prior membership
        await DepartmentMember.deleteMany({ userId });

        const membership = await DepartmentMember.create({
            departmentId: dept.departmentId,
            userId,
            organizationId: dept.organizationId,
            orgRoleId,
        });

        user.primaryDepartmentId = dept.departmentId;
        user.orgRoleId = orgRoleId;
        // Merge role permissions onto user (keep account-level admin overrides)
        if (user.role === 'team') {
            const perms = { ...(user.permissions || {}) } as Record<string, boolean>;
            for (const key of ORG_ROLE_EDITABLE_PERMISSIONS) {
                if (typeof (role.permissions as any)?.[key] === 'boolean') {
                    perms[key] = (role.permissions as any)[key];
                }
            }
            user.permissions = perms as any;
        }
        await user.save();

        recordActivityFromReq(req, {
            action: 'department.member.add',
            category: 'department',
            resourceType: 'department',
            resourceId: dept.departmentId,
            message: `Added ${user.fullName || userId} to ${dept.name} as ${role.name}`,
            metadata: { userId, orgRoleId },
        });

        res.status(201).json({ success: true, data: { membership } });
    } catch (error) {
        next(error);
    }
};

export const removeDepartmentMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const { userId } = req.params;
        const dept = await Department.findOne({ departmentId: req.params.id });
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        await DepartmentMember.deleteOne({ departmentId: dept.departmentId, userId });
        await User.updateOne(
            { userId, primaryDepartmentId: dept.departmentId },
            { $set: { primaryDepartmentId: null, orgRoleId: null } }
        );

        recordActivityFromReq(req, {
            action: 'department.member.remove',
            category: 'department',
            resourceType: 'department',
            resourceId: dept.departmentId,
            message: `Removed member ${userId} from ${dept.name}`,
            metadata: { userId },
        });

        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        next(error);
    }
};

// ── Org Roles ────────────────────────────────────────────────

export const listOrgRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canViewDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'organizationId required' });
        }
        await ensureDefaultOrgRoles(orgId);
        const roles = await OrgRole.find({ organizationId: orgId }).sort({ name: 1 }).lean();
        res.json({
            success: true,
            data: { roles, editablePermissions: ORG_ROLE_EDITABLE_PERMISSIONS },
        });
    } catch (error) {
        next(error);
    }
};

export const createOrgRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'organizationId required' });
        }
        const { name, description, permissions, isLeader } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        const roleId = `role_${uuidv4()}`;
        const perms: Record<string, boolean> = {};
        for (const key of ORG_ROLE_EDITABLE_PERMISSIONS) {
            perms[key] = permissions?.[key] === true;
        }
        perms[PERMISSIONS.DOCUMENT_PREVIEW] = perms[PERMISSIONS.DOCUMENT_VIEW] === true;

        const role = await OrgRole.create({
            roleId,
            organizationId: orgId,
            name: String(name).trim(),
            description: description ? String(description) : '',
            permissions: perms,
            isLeader: !!isLeader,
            isSystem: false,
        });

        res.status(201).json({ success: true, data: { role } });
    } catch (error) {
        next(error);
    }
};

export const updateOrgRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const orgId = requireOrg(req);
        const role = await OrgRole.findOne({ roleId: req.params.id });
        if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
        if (orgId && role.organizationId !== orgId && req.user.role !== 'superAdmin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { name, description, permissions, isLeader } = req.body || {};
        if (name) role.name = String(name).trim();
        if (description !== undefined) role.description = String(description);
        if (typeof isLeader === 'boolean') role.isLeader = isLeader;
        if (permissions && typeof permissions === 'object') {
            const perms = { ...(role.permissions as any) };
            for (const key of ORG_ROLE_EDITABLE_PERMISSIONS) {
                if (typeof permissions[key] === 'boolean') perms[key] = permissions[key];
            }
            perms[PERMISSIONS.DOCUMENT_PREVIEW] = perms[PERMISSIONS.DOCUMENT_VIEW] === true;
            role.permissions = perms;
        }
        await role.save();

        // Sync role permissions onto assigned team users
        if (permissions && typeof permissions === 'object') {
            const members = await DepartmentMember.find({ orgRoleId: role.roleId }).lean();
            for (const m of members) {
                const user = await User.findOne({ userId: m.userId, role: 'team' });
                if (!user) continue;
                const perms = { ...(user.permissions as any) };
                for (const key of ORG_ROLE_EDITABLE_PERMISSIONS) {
                    if (typeof (role.permissions as any)?.[key] === 'boolean') {
                        perms[key] = (role.permissions as any)[key];
                    }
                }
                perms[PERMISSIONS.DOCUMENT_PREVIEW] = perms[PERMISSIONS.DOCUMENT_VIEW] === true;
                user.permissions = perms;
                await user.save();
            }
        }

        res.json({ success: true, data: { role } });
    } catch (error) {
        next(error);
    }
};

export const deleteOrgRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!canManageDepartments(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const role = await OrgRole.findOne({ roleId: req.params.id });
        if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
        if (role.isSystem) {
            return res.status(400).json({ success: false, message: 'Cannot delete system roles' });
        }
        const inUse = await DepartmentMember.countDocuments({ orgRoleId: role.roleId });
        if (inUse > 0) {
            return res.status(400).json({ success: false, message: 'Role is assigned to members' });
        }
        await OrgRole.deleteOne({ roleId: role.roleId });
        res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
        next(error);
    }
};

// ── Document shares ──────────────────────────────────────────

export const shareDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!hasPermission(req.user, PERMISSIONS.DOCUMENT_SHARE) && req.user.role === 'team') {
            // Leaders get share via role; also allow if isLeader
            const ctx = await loadUserDeptContext(req.user);
            if (!ctx.isLeader) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        }

        const doc = await Document.findOne({ documentId: req.params.id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (doc.uploadedBy !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
            return res.status(403).json({ success: false, message: 'Only the uploader can share this document' });
        }
        if (!(await canAccessDocument(req.user, doc))) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { scope, targetUserIds, departmentId } = req.body || {};
        if (scope !== 'user' && scope !== 'department') {
            return res.status(400).json({ success: false, message: 'scope must be user or department' });
        }

        await DocumentShare.deleteMany({ documentId: doc.documentId, sharedBy: req.user.userId });

        const share = await DocumentShare.create({
            shareId: `share_${uuidv4()}`,
            documentId: doc.documentId,
            sharedBy: req.user.userId,
            organizationId: doc.organizationId || req.user.organizationId || '',
            scope,
            targetUserIds: scope === 'user' ? (Array.isArray(targetUserIds) ? targetUserIds : []) : [],
            departmentId:
                scope === 'department'
                    ? departmentId || doc.departmentId || null
                    : null,
        });

        recordActivityFromReq(req, {
            action: 'document.share',
            category: 'document',
            resourceType: 'document',
            resourceId: doc.documentId,
            message: `Shared ${doc.originalFilename} (${scope})`,
            metadata: { scope, targetUserIds, departmentId: share.departmentId },
        });

        res.status(201).json({ success: true, data: { share } });
    } catch (error) {
        next(error);
    }
};

export const unshareDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await Document.findOne({ documentId: req.params.id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (doc.uploadedBy !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        await DocumentShare.deleteMany({ documentId: doc.documentId, sharedBy: req.user.userId });
        res.json({ success: true, message: 'Shares removed' });
    } catch (error) {
        next(error);
    }
};

export const listDocumentShares = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await Document.findOne({ documentId: req.params.id }).lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (!(await canAccessDocument(req.user, doc))) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const shares = await DocumentShare.find({ documentId: doc.documentId }).lean();
        res.json({ success: true, data: { shares } });
    } catch (error) {
        next(error);
    }
};
