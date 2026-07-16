import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    chatWithDocuments,
    deleteChatSessionHandler,
    getChatSessionHandler,
    listChatSessionsHandler,
} from '../controllers/chatController';

const router = Router();

router.get('/sessions', authenticate, listChatSessionsHandler);
router.get('/sessions/:id', authenticate, getChatSessionHandler);
router.delete('/sessions/:id', authenticate, deleteChatSessionHandler);
router.post('/', authenticate, chatWithDocuments);

export default router;
