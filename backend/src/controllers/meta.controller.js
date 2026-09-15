import { getSupportedLanguages } from '../services/language.service.js';
export function getLanguages(_req, res) {
    return res.json(getSupportedLanguages());
}
export function getHealth(_req, res) {
    return res.json({ status: 'ok' });
}
