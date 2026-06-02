import { env } from '../config/env.js';
import { analyzeImageWithVision, explainDiagnosis } from './llm.service.js';
import { safeJson } from './http.service.js';

interface DiagnosisInput {
  imageName: string;
  cropHint?: string;
  imageBuffer?: Buffer;
  language?: string;
}

interface DiagnosisResult {
  detectedCrop: string;
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  recommendations: string[];
  source: 'plant-id' | 'openai-vision' | 'heuristic-demo';
  explanation?: string;
}

function fallbackDiagnosis(
  input: DiagnosisInput,
  overrides?: {
    detectedCrop?: string;
    source?: DiagnosisResult['source'];
  },
): DiagnosisResult {
  return {
    detectedCrop: overrides?.detectedCrop ?? input.cropHint?.trim() ?? 'Unknown Crop',
    diseaseName: 'Unable to confirm disease from image',
    confidence: 0.25,
    severity: 'low',
    symptoms: ['The image did not contain enough clear disease detail for a reliable diagnosis.'],
    recommendations: [
      'Upload a closer image of the affected leaf or stem.',
      'Ensure the image is well lit and focused.',
      'Capture both the affected area and the full plant if possible.',
      'Add the crop name to improve disease assessment.',
      'Consult a local agronomist for field-specific treatment guidance.',
    ],
    source: overrides?.source ?? 'heuristic-demo',
  };
}

const genericDiseaseNames = new Set([
  'fungi',
  'animalia',
  'insecta',
  'abiotic',
  'senescence',
  'finished flowering period',
  'water-related issue',
  'mechanical damage',
  'water excess or uneven watering',
]);

function normalizeSeverity(probability: number) {
  if (probability >= 0.85) {
    return 'high' as const;
  }

  if (probability >= 0.6) {
    return 'medium' as const;
  }

  return 'low' as const;
}

function needsVisionFallback(result: DiagnosisResult) {
  const normalizedDiseaseName = result.diseaseName.trim().toLowerCase();

  return (
    result.diseaseName === 'Unidentified disease' ||
    result.diseaseName === 'Unable to confirm disease from image' ||
    genericDiseaseNames.has(normalizedDiseaseName) ||
    result.confidence < 0.55 ||
    result.symptoms.some((symptom) => symptom.includes('did not provide'))
  );
}

async function identifyPlant(base64Image: string) {
  const url = new URL(env.plantIdIdentificationUrl);
  url.searchParams.set('details', 'common_names,url,description');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.plantIdApiKey,
    },
    body: JSON.stringify({
      images: [base64Image],
      similar_images: false,
    }),
  });

  if (!response.ok) {
    return null;
  }

  return safeJson<{
    result?: {
      classification?: {
        suggestions?: Array<{
          name?: string;
          probability?: number;
        }>;
      };
    };
  }>(response);
}

async function assessHealth(base64Image: string) {
  const url = new URL(env.plantIdHealthUrl);
  url.searchParams.set('details', 'local_name,description,treatment,cause,common_names,classification,url');
  url.searchParams.set('language', 'en');
  url.searchParams.set('full_disease_list', 'true');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.plantIdApiKey,
    },
    body: JSON.stringify({
      images: [base64Image],
      similar_images: false,
      details: ['description', 'treatment'],
    }),
  });

  if (!response.ok) {
    return null;
  }

  return safeJson<{
    result?: {
      is_healthy?: { binary?: boolean; probability?: number };
      disease?: {
        suggestions?: Array<{
          name?: string;
          probability?: number;
          details?: {
            description?: string;
            treatment?: {
              prevention?: string[];
              biological?: string[];
              chemical?: string[];
            };
          };
        }>;
      };
    };
  }>(response);
}

function pickBestDiseaseSuggestion(
  suggestions: Array<{
    name?: string;
    probability?: number;
    redundant?: boolean;
    details?: {
      description?: string;
      treatment?: {
        prevention?: string[];
        biological?: string[];
        chemical?: string[];
      };
    };
  }> = [],
) {
  const ranked = [...suggestions].sort((left, right) => (right.probability ?? 0) - (left.probability ?? 0));

  const specificSuggestion = ranked.find((suggestion) => {
    const name = suggestion.name?.trim().toLowerCase() ?? '';
    return !suggestion.redundant && !genericDiseaseNames.has(name) && (suggestion.probability ?? 0) >= 0.15;
  });

  return specificSuggestion ?? ranked[0] ?? null;
}

export async function analyzeCropImage(input: DiagnosisInput): Promise<DiagnosisResult> {
  if (!input.imageBuffer) {
    const result = fallbackDiagnosis(input);
    result.explanation = await explainDiagnosis({
      crop: result.detectedCrop,
      disease: result.diseaseName,
      language: input.language ?? 'en',
      symptoms: result.symptoms,
      recommendations: result.recommendations,
    });
    return result;
  }

  const base64Image = input.imageBuffer.toString('base64');
  console.log('[diagnosis] starting analysis', {
    cropHint: input.cropHint,
    language: input.language ?? 'en',
    hasOpenAIKey: Boolean(env.openAiApiKey),
    openAiModel: env.openAiModel,
    hasPlantIdKey: Boolean(env.plantIdApiKey),
  });

  const visionFirstResult = await analyzeImageWithVision({
    base64Image,
    language: input.language ?? 'en',
    cropHint: input.cropHint,
  });

  if (visionFirstResult) {
    console.log('[diagnosis] using openai-vision result', {
      crop: visionFirstResult.detectedCrop,
      disease: visionFirstResult.diseaseName,
      confidence: visionFirstResult.confidence,
    });
    return {
      detectedCrop: visionFirstResult.detectedCrop,
      diseaseName: visionFirstResult.diseaseName,
      confidence: visionFirstResult.confidence,
      severity: visionFirstResult.severity,
      symptoms: visionFirstResult.symptoms,
      recommendations: visionFirstResult.recommendations,
      explanation:
        visionFirstResult.explanation ??
        (await explainDiagnosis({
          crop: visionFirstResult.detectedCrop,
          disease: visionFirstResult.diseaseName,
          language: input.language ?? 'en',
          symptoms: visionFirstResult.symptoms,
          recommendations: visionFirstResult.recommendations,
        })),
      source: 'openai-vision',
    };
  }

  console.log('[diagnosis] openai-vision returned null, falling back to plant-id');

  if (!env.plantIdApiKey) {
    const result = fallbackDiagnosis(input);
    result.explanation = await explainDiagnosis({
      crop: result.detectedCrop,
      disease: result.diseaseName,
      language: input.language ?? 'en',
      symptoms: result.symptoms,
      recommendations: result.recommendations,
    });
    return result;
  }

  const [identification, health] = await Promise.all([identifyPlant(base64Image), assessHealth(base64Image)]);
  console.log('[diagnosis] plant-id raw availability', {
    hasIdentification: Boolean(identification),
    hasHealth: Boolean(health),
    identifiedCrop: identification?.result?.classification?.suggestions?.[0]?.name,
    diseaseSuggestion: health?.result?.disease?.suggestions?.[0]?.name,
  });

  const cropSuggestion = identification?.result?.classification?.suggestions?.[0];
  const diseaseSuggestion = pickBestDiseaseSuggestion(health?.result?.disease?.suggestions);
  const diseaseProbability = diseaseSuggestion?.probability ?? 0.4;
  const healthyProbability = health?.result?.is_healthy?.probability ?? 0;
  const isHealthy = Boolean(health?.result?.is_healthy?.binary) && healthyProbability >= 0.75 && diseaseProbability < 0.2;

  const result: DiagnosisResult = {
    detectedCrop: cropSuggestion?.name ?? input.cropHint?.trim() ?? 'Unknown Crop',
    diseaseName: isHealthy ? 'Healthy crop' : diseaseSuggestion?.name ?? 'Unidentified disease',
    confidence: isHealthy ? healthyProbability || 0.9 : diseaseProbability,
    severity: isHealthy ? 'low' : normalizeSeverity(diseaseProbability),
    symptoms: diseaseSuggestion?.details?.description
      ? [diseaseSuggestion.details.description]
      : ['Plant.id did not provide a detailed disease description.'],
    recommendations: [
      ...(diseaseSuggestion?.details?.treatment?.prevention ?? []),
      ...(diseaseSuggestion?.details?.treatment?.biological ?? []),
      ...(diseaseSuggestion?.details?.treatment?.chemical ?? []),
    ].slice(0, 4),
    source: 'plant-id',
  };

  if (result.recommendations.length === 0) {
    result.recommendations.push('Consult a local agronomist for field-specific treatment guidance.');
  }

  if (!isHealthy && needsVisionFallback(result)) {
    const fallbackResult = fallbackDiagnosis(input, {
      detectedCrop: result.detectedCrop,
    });
    fallbackResult.explanation = await explainDiagnosis({
      crop: fallbackResult.detectedCrop,
      disease: fallbackResult.diseaseName,
      language: input.language ?? 'en',
      symptoms: fallbackResult.symptoms,
      recommendations: fallbackResult.recommendations,
    });

    console.log('[diagnosis] plant-id result too weak, using fallback result', {
      crop: fallbackResult.detectedCrop,
      disease: fallbackResult.diseaseName,
      confidence: fallbackResult.confidence,
    });

    return fallbackResult;
  }

  result.explanation = await explainDiagnosis({
    crop: result.detectedCrop,
    disease: result.diseaseName,
    language: input.language ?? 'en',
    symptoms: result.symptoms,
    recommendations: result.recommendations,
  });

  console.log('[diagnosis] final plant-id result', {
    crop: result.detectedCrop,
    disease: result.diseaseName,
    confidence: result.confidence,
  });

  return result;
}
