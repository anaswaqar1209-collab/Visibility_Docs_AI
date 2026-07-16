export const PERMISSIONS = {
    DOCUMENT_UPLOAD: 'document.upload',
    DOCUMENT_VIEW: 'document.view',
    DOCUMENT_DELETE: 'document.delete',
    DOCUMENT_PREVIEW: 'document.preview',
    CHAT_USE: 'chat.use',
    TEAM_MANAGE: 'team.manage',
    ORG_DOCUMENTS_VIEW: 'org.documents.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_TEAM_PERMISSIONS: Record<PermissionKey, boolean> = {
    [PERMISSIONS.DOCUMENT_UPLOAD]: true,
    [PERMISSIONS.DOCUMENT_VIEW]: true,
    [PERMISSIONS.DOCUMENT_DELETE]: true,
    [PERMISSIONS.DOCUMENT_PREVIEW]: true,
    [PERMISSIONS.CHAT_USE]: true,
    [PERMISSIONS.TEAM_MANAGE]: false,
    [PERMISSIONS.ORG_DOCUMENTS_VIEW]: false,
};

export const DEFAULT_ADMIN_PERMISSIONS: Record<PermissionKey, boolean> = {
    [PERMISSIONS.DOCUMENT_UPLOAD]: true,
    [PERMISSIONS.DOCUMENT_VIEW]: true,
    [PERMISSIONS.DOCUMENT_DELETE]: true,
    [PERMISSIONS.DOCUMENT_PREVIEW]: true,
    [PERMISSIONS.CHAT_USE]: true,
    [PERMISSIONS.TEAM_MANAGE]: true,
    [PERMISSIONS.ORG_DOCUMENTS_VIEW]: true,
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Only these can be toggled for team members in the Team UI. */
export const TEAM_MEMBER_EDITABLE_PERMISSIONS: PermissionKey[] = [
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.CHAT_USE,
];
