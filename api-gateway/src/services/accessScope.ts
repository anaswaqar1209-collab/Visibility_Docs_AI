import { PERMISSIONS } from '../types/permissions';

export interface AuthUser {
    userId: string;
    role: string;
    organizationId?: string | null;
    permissions?: Record<string, boolean>;
}

export function hasPermission(user: AuthUser, permission: string): boolean {
    if (user.role === 'superAdmin') return true;
    if (user.role === 'admin') return true;
    if (user.permissions?.[permission] === true) return true;
    // View covers preview (single "View" toggle in Team UI)
    if (permission === PERMISSIONS.DOCUMENT_PREVIEW) {
        return user.permissions?.[PERMISSIONS.DOCUMENT_VIEW] === true;
    }
    return false;
}

/**
 * Build Mongo filter for documents the user may access.
 * - team: own uploads only (task.md point 3)
 * - admin: own uploads; org-wide if org.documents.view permission
 * - superAdmin: all (optional organizationId query param)
 */
export function buildDocumentFilter(
    user: AuthUser,
    extra: Record<string, unknown> = {},
    options?: { organizationId?: string }
): Record<string, unknown> {
    const base: Record<string, unknown> = { ...extra };

    if (user.role === 'superAdmin') {
        if (options?.organizationId) {
            base.organizationId = options.organizationId;
        }
        return base;
    }

    if (user.role === 'admin' && hasPermission(user, PERMISSIONS.ORG_DOCUMENTS_VIEW) && user.organizationId) {
        return {
            ...base,
            organizationId: user.organizationId,
        };
    }

    // team and default admin: own uploads only
    return {
        ...base,
        uploadedBy: user.userId,
    };
}

export function canAccessDocument(user: AuthUser, doc: { uploadedBy: string; organizationId?: string | null }): boolean {
    if (user.role === 'superAdmin') return true;
    if (doc.uploadedBy === user.userId) return true;
    if (
        user.role === 'admin' &&
        hasPermission(user, PERMISSIONS.ORG_DOCUMENTS_VIEW) &&
        user.organizationId &&
        doc.organizationId === user.organizationId
    ) {
        return true;
    }
    return false;
}

export function canDeleteDocument(user: AuthUser, doc: { uploadedBy: string }): boolean {
    if (user.role === 'superAdmin') return true;
    if (!hasPermission(user, PERMISSIONS.DOCUMENT_DELETE)) return false;
    if (user.role === 'admin') return doc.uploadedBy === user.userId || hasPermission(user, PERMISSIONS.ORG_DOCUMENTS_VIEW);
    return doc.uploadedBy === user.userId;
}
