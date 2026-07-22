import { getAuthValue, getStoredUser } from "./authSession";

export const PERMS = {
    UPLOAD: "document.upload",
    VIEW: "document.view",
    DELETE: "document.delete",
    PREVIEW: "document.preview",
    SHARE: "document.share",
    CHAT: "chat.use",
    DEPT_VIEW: "department.view",
    DEPT_MANAGE: "department.manage",
} as const;

/** Permissions editable for team members (shown in Team UI). */
export const TEAM_PERM_LABELS: { key: string; label: string; hint?: string }[] = [
    { key: PERMS.UPLOAD, label: "Upload", hint: "Add files to the library" },
    { key: PERMS.VIEW, label: "View", hint: "Browse, details, and preview files" },
    { key: PERMS.DELETE, label: "Delete", hint: "Remove documents" },
    { key: PERMS.CHAT, label: "Chat", hint: "Ask AI about documents" },
];

/** Default flags for new team members (matches api-gateway defaults). */
export const DEFAULT_TEAM_PERMS: Record<string, boolean> = {
    [PERMS.UPLOAD]: true,
    [PERMS.VIEW]: true,
    [PERMS.DELETE]: true,
    [PERMS.PREVIEW]: true,
    [PERMS.SHARE]: false,
    [PERMS.CHAT]: true,
    [PERMS.DEPT_VIEW]: true,
    [PERMS.DEPT_MANAGE]: false,
};

export function getUserPermissions(): Record<string, boolean> {
    const user = getStoredUser<{ permissions?: Record<string, boolean>; role?: string }>();
    if (user?.permissions && typeof user.permissions === "object") {
        return user.permissions;
    }
    const raw = getAuthValue("permissions");
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        return {};
    }
}

export function getUserRole(): string {
    return getStoredUser<{ role?: string }>()?.role || "team";
}

/** Admins always have full access; team members use stored flags. */
export function hasAppPermission(permission: string): boolean {
    const role = getUserRole();
    if (role === "superAdmin" || role === "admin") return true;
    const perms = getUserPermissions();
    if (permission === PERMS.PREVIEW) {
        return perms[PERMS.PREVIEW] === true || perms[PERMS.VIEW] === true;
    }
    return perms[permission] === true;
}

export function canUpload() {
    return hasAppPermission(PERMS.UPLOAD);
}
export function canViewDocs() {
    return hasAppPermission(PERMS.VIEW);
}
export function canDeleteDocs() {
    return hasAppPermission(PERMS.DELETE);
}
export function canChat() {
    return hasAppPermission(PERMS.CHAT);
}
export function canShareDocs() {
    return hasAppPermission(PERMS.SHARE);
}
export function canViewDepartments() {
    return hasAppPermission(PERMS.DEPT_VIEW);
}
export function canManageDepartments() {
    return hasAppPermission(PERMS.DEPT_MANAGE);
}
