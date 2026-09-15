import { Router } from 'express';
import multer from 'multer';
import { createDiagnosisReport, getDiagnosisReports } from '../controllers/diagnosis.controller.js';
const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
router.get('/reports', getDiagnosisReports);
router.post('/analyze', upload.single('image'), createDiagnosisReport);
export default router;
