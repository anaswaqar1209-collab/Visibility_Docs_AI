import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_TEAM_PERMISSIONS } from '../types/permissions';

export type UserRole = 'superAdmin' | 'admin' | 'team' | 'service_account';

export interface IUserPermissions {
    'document.upload'?: boolean;
    'document.view'?: boolean;
    'document.delete'?: boolean;
    'document.preview'?: boolean;
    'chat.use'?: boolean;
    'team.manage'?: boolean;
    'org.documents.view'?: boolean;
}

export interface IUser extends Document {
    userId: string;
    username: string;
    fullName: string;
    email: string;
    contactNumber?: string;
    accountType: 'personal' | 'enterprise';
    passwordHash: string;
    role: UserRole;
    organizationId?: string | null;
    createdBy?: string | null;
    permissions?: IUserPermissions;
    status: 'active' | 'blocked' | 'pending';
    emailVerified?: boolean;
    openRemoteRealm?: string | null;
    openRemoteSynced?: boolean;
    openRemoteSyncedAt?: Date;
    openRemoteUserId?: string;
    openRemoteSecret?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PermissionsSchema = new Schema<IUserPermissions>(
    {
        'document.upload': { type: Boolean, default: true },
        'document.view': { type: Boolean, default: true },
        'document.delete': { type: Boolean, default: true },
        'document.preview': { type: Boolean, default: true },
        'chat.use': { type: Boolean, default: true },
        'team.manage': { type: Boolean, default: false },
        'org.documents.view': { type: Boolean, default: false },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>(
    {
        userId: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        contactNumber: { type: String },
        accountType: {
            type: String,
            enum: ['personal', 'enterprise'],
            default: 'personal',
            required: true,
        },
        passwordHash: { type: String, required: true },
        role: {
            type: String,
            enum: ['superAdmin', 'admin', 'team', 'service_account'],
            required: true,
        },
        organizationId: { type: String, default: null, index: true },
        createdBy: { type: String, default: null },
        permissions: { type: PermissionsSchema, default: () => ({ ...DEFAULT_TEAM_PERMISSIONS }) },
        status: {
            type: String,
            enum: ['active', 'blocked', 'pending'],
            default: 'active',
        },
        emailVerified: { type: Boolean, default: false },
        openRemoteRealm: { type: String, default: null },
        openRemoteSynced: { type: Boolean, default: false },
        openRemoteSyncedAt: { type: Date },
        openRemoteUserId: { type: String },
        openRemoteSecret: { type: String },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

export function defaultPermissionsForRole(role: UserRole): IUserPermissions {
    if (role === 'admin' || role === 'superAdmin') return { ...DEFAULT_ADMIN_PERMISSIONS };
    return { ...DEFAULT_TEAM_PERMISSIONS };
}

export default mongoose.model<IUser>('User', UserSchema);
