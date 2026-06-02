import { Request, Response } from 'express';

import { getSupportedLanguages } from '../services/language.service.js';

export function getLanguages(_req: Request, res: Response) {
  return res.json(getSupportedLanguages());
}

export function getHealth(_req: Request, res: Response) {
  return res.json({ status: 'ok' });
}
