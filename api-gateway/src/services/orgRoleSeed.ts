import { v4 as uuidv4 } from 'uuid';
import OrgRole from '../models/OrgRole';
import {
    DEFAULT_EMPLOYEE_PERMISSIONS,
    DEFAULT_LEADER_PERMISSIONS,
    DEFAULT_MANAGER_PERMISSIONS,
    PERMISSIONS,
} from '../types/permissions';

const DEFAULTS = [
    {
        name: 'Leader',
        description: 'Department head — uploads private to peers until shared',
        isLeader: true,
        permissions: DEFAULT_LEADER_PERMISSIONS,
    },
    {
        name: 'Employee',
        description: 'Department member — peer document visibility',
        isLeader: false,
        permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    },
    {
        name: 'Manager',
        description: 'Can manage department membership and share documents',
        isLeader: false,
        permissions: DEFAULT_MANAGER_PERMISSIONS,
    },
];

/** Idempotent seed of Leader / Employee / Manager for an organization. */
export async function ensureDefaultOrgRoles(organizationId: string): Promise<void> {
    if (!organizationId) return;
    for (const def of DEFAULTS) {
        const existing = await OrgRole.findOne({ organizationId, name: def.name });
        if (existing) continue;
        const perms = { ...def.permissions };
        perms[PERMISSIONS.DOCUMENT_PREVIEW] = perms[PERMISSIONS.DOCUMENT_VIEW];
        await OrgRole.create({
            roleId: `role_${uuidv4()}`,
            organizationId,
            name: def.name,
            description: def.description,
            permissions: perms,
            isLeader: def.isLeader,
            isSystem: true,
        });
    }
}
