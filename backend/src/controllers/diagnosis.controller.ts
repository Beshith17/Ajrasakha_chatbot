import { Request, Response } from 'express';

import { DiagnosisReport } from '../models/DiagnosisReport.js';
import { analyzeCropImage } from '../services/diagnosis.service.js';

export async function createDiagnosisReport(req: Request, res: Response) {
  const image = req.file;
  const { cropHint, farmerName, language } = req.body as { cropHint?: string; farmerName?: string; language?: string };

  if (!image) {
    return res.status(400).json({ message: 'Image file is required.' });
  }

  const diagnosis = await analyzeCropImage({
    imageName: image.originalname,
    cropHint,
    imageBuffer: image.buffer,
    language,
  });

  const report = await DiagnosisReport.create({
    farmerName,
    imageName: image.originalname,
    cropHint,
    ...diagnosis,
  });

  return res.status(201).json(report);
}

export async function getDiagnosisReports(_req: Request, res: Response) {
  const reports = await DiagnosisReport.find().sort({ createdAt: -1 }).limit(12).lean();
  return res.json(reports);
}
