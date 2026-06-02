import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const envPath = path.resolve(currentDir, '../../.env');

dotenv.config({ path: envPath });

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ajrasakha',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  sarvamApiKey: process.env.SARVAM_API_KEY ?? '',
  sarvamBaseUrl: process.env.SARVAM_BASE_URL ?? 'https://api.sarvam.ai',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiBaseUrl: process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  plantIdApiKey: process.env.PLANT_ID_API_KEY ?? process.env.KINDWISE_API_KEY ?? '',
  plantIdIdentificationUrl: process.env.PLANT_ID_IDENTIFICATION_URL ?? 'https://api.plant.id/v3/identification',
  plantIdHealthUrl: process.env.PLANT_ID_HEALTH_URL ?? 'https://api.plant.id/v3/health_assessment',
};
