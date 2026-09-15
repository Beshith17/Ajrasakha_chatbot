import { Router } from 'express';
import multer from 'multer';
import { synthesizeSpeech, transcribeSpeech } from '../controllers/speech.controller.js';
const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});
router.post('/transcribe', upload.single('audio'), transcribeSpeech);
router.post('/synthesize', synthesizeSpeech);
export default router;
