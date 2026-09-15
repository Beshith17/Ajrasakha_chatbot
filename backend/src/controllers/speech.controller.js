import { normalizeLanguage } from '../services/language.service.js';
import { sarvamSynthesizeSpeech, sarvamTranscribeAudio } from '../services/sarvam.service.js';
export async function transcribeSpeech(req, res) {
    const audio = req.file;
    const language = normalizeLanguage(String(req.body.language ?? 'en'));
    if (!audio) {
        return res.status(400).json({ message: 'Audio file is required.' });
    }
    try {
        const transcript = await sarvamTranscribeAudio(audio.buffer, audio.mimetype, language);
        return res.json({ transcript });
    }
    catch (error) {
        return res.status(503).json({
            message: error instanceof Error ? error.message : 'Speech transcription unavailable.',
        });
    }
}
export async function synthesizeSpeech(req, res) {
    const { text, language } = req.body;
    if (!text?.trim()) {
        return res.status(400).json({ message: 'Text is required.' });
    }
    try {
        const audioBase64 = await sarvamSynthesizeSpeech(text.trim(), normalizeLanguage(language));
        return res.json({ audioBase64 });
    }
    catch (error) {
        return res.status(503).json({
            message: error instanceof Error ? error.message : 'Speech synthesis unavailable.',
        });
    }
}
