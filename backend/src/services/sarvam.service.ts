import { env } from '../config/env.js';
import { ensureOk, safeJson } from './http.service.js';

const speechLocales: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
};

function hasSarvam() {
  return Boolean(env.sarvamApiKey);
}

export function getSpeechLocale(language: string) {
  return speechLocales[language] ?? 'en-IN';
}

export async function sarvamTranslateText(text: string, targetLanguage: string) {
  if (!hasSarvam() || targetLanguage === 'en') {
    return text;
  }

  const response = await fetch(`${env.sarvamBaseUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': env.sarvamApiKey,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: 'en-IN',
      target_language_code: getSpeechLocale(targetLanguage),
      mode: 'formal',
    }),
  });

  if (!response.ok) {
    return text;
  }

  const data = await safeJson<{ translated_text?: string }>(response);
  return data?.translated_text ?? text;
}

export async function sarvamTranscribeAudio(file: Buffer, mimeType: string, language: string) {
  if (!hasSarvam()) {
    throw new Error('Sarvam is not configured.');
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(file)], { type: mimeType });
  formData.append('file', blob, 'farmer-audio.webm');
  formData.append('model', 'saarika:v2.5');
  formData.append('language_code', getSpeechLocale(language));

  const response = await fetch(`${env.sarvamBaseUrl}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': env.sarvamApiKey,
    },
    body: formData,
  });

  ensureOk(response, 'Sarvam transcription failed');
  const data = await safeJson<{ transcript?: string; text?: string }>(response);

  return data?.transcript ?? data?.text ?? '';
}

export async function sarvamSynthesizeSpeech(text: string, language: string) {
  if (!hasSarvam()) {
    throw new Error('Sarvam is not configured.');
  }

  const response = await fetch(`${env.sarvamBaseUrl}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': env.sarvamApiKey,
    },
    body: JSON.stringify({
      text,
      target_language_code: getSpeechLocale(language),
      speaker: 'anushka',
      pitch: 0,
      pace: 1,
      loudness: 1,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    }),
  });

  ensureOk(response, 'Sarvam speech synthesis failed');
  const data = await safeJson<{ audios?: string[]; audio?: string }>(response);
  return data?.audios?.[0] ?? data?.audio ?? '';
}
