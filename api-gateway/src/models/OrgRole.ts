import mongoose, { Document, Schema } from 'mongoose';
import { PermissionKey } from '../types/permissions';

export interface IOrgRolePermissions {
    'document.upload'?: boolean;
    'document.view'?: boolean;
    'document.delete'?: boolean;
    'document.preview'?: boolean;
    'document.share'?: boolean;
    'chat.use'?: boolean;
    'team.manage'?: boolean;
    'org.documents.view'?: boolean;
    'department.manage'?: boolean;
    'department.view'?: boolean;
}

export interface IOrgRole extends Document {
    roleId: string;
    organizationId: string;
    name: string;
    description?: string;
    permissions: IOrgRolePermissions;
    /** When true, department-scoped uploads are private to peers until shared */
    isLeader: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OrgRolePermissionsSchema = new Schema<IOrgRolePermissions>(
    {
        'document.upload': { type: Boolean, default: true },
        'document.view': { type: Boolean, default: true },
        'document.delete': { type: Boolean, default: true },
        'document.preview': { type: Boolean, default: true },
        'document.share': { type: Boolean, default: false },
        'chat.use': { type: Boolean, default: true },
        'team.manage': { type: Boolean, default: false },
        'org.documents.view': { type: Boolean, default: false },
        'department.manage': { type: Boolean, default: false },
        'department.view': { type: Boolean, default: true },
    },
    { _id: false }
);

const OrgRoleSchema = new Schema<IOrgRole>(
    {
        roleId: { type: String, required: true, unique: true, index: true },
        organizationId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        permissions: { type: OrgRolePermissionsSchema, required: true },
        isLeader: { type: Boolean, default: false },
        isSystem: { type: Boolean, default: false },
    },
    { timestamps: true }
);

OrgRoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export type OrgRolePermissionMap = Partial<Record<PermissionKey, boolean>>;

export default mongoose.model<IOrgRole>('OrgRole', OrgRoleSchema);
