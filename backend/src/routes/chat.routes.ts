import { Router } from 'express';

import {
  createChatSession,
  createExpertReply,
  createFarmerMessage,
  clearChatSession,
  deleteChatSession,
  endChatSession,
  getChatSessionById,
  getChatSessions,
  joinChatSession,
} from '../controllers/chat.controller.js';

const router = Router();

router.post('/sessions', createChatSession);
router.post('/sessions/join', joinChatSession);
router.post('/messages', createFarmerMessage);
router.post('/sessions/:sessionId/replies', createExpertReply);
router.post('/sessions/:sessionId/end', endChatSession);
router.post('/sessions/:sessionId/clear', clearChatSession);
router.get('/sessions', getChatSessions);
router.get('/sessions/:sessionId', getChatSessionById);
router.delete('/sessions/:sessionId', deleteChatSession);

export default router;
