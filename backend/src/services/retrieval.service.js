import { ReviewQueueItem } from '../models/ReviewQueueItem.js';
import { normalizeLanguage } from './language.service.js';
import { generateAgricultureAnswer } from './llm.service.js';
export async function resolveAnswer(input) {
    const language = normalizeLanguage(input.language);
    const question = input.question.trim();
    const localizedAnswer = await generateAgricultureAnswer({
        question,
        language,
    });
    await ReviewQueueItem.create({
        question,
        answer: localizedAnswer,
        language,
        status: 'pending',
    });
    return {
        answer: localizedAnswer,
        source: 'ai',
    };
}
