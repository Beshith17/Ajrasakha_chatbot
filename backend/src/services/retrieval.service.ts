import { ReviewQueueItem } from '../models/ReviewQueueItem.js';
import { normalizeLanguage } from './language.service.js';
import { generateAgricultureAnswer } from './llm.service.js';

interface ChatRequestInput {
  question: string;
  language: string;
}

interface ChatResponse {
  answer: string;
  source: 'ai';
  matchedQuestion?: string;
}

export async function resolveAnswer(input: ChatRequestInput): Promise<ChatResponse> {
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
