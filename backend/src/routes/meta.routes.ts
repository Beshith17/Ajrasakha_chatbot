import { Router } from 'express';

import { getHealth, getLanguages } from '../controllers/meta.controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/languages', getLanguages);

export default router;
