import { Router } from 'express';
import { authenticate, authorize, requirePermission } from '../middleware/auth';
import {
    createMember,
    deleteMember,
    listMembers,
    updateMember,
    updateMemberPermissions,
    updateMemberStatus,
} from '../controllers/teamController';
import { PERMISSIONS } from '../types/permissions';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));
router.use(requirePermission(PERMISSIONS.TEAM_MANAGE));

router.get('/members', listMembers);
router.post('/members', createMember);
router.put('/members/:userId', updateMember);
router.patch('/members/:userId/status', updateMemberStatus);
router.patch('/members/:userId/permissions', updateMemberPermissions);
router.delete('/members/:userId', deleteMember);

export default router;
