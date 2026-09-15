import { env } from '../config/env.js';
import { safeJson } from './http.service.js';
import { normalizeLanguage } from './language.service.js';
const languageNames = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
    kn: 'Kannada',
};
function fallbackAnswer(input) {
    const question = input.question.toLowerCase();
    if (question.includes('summer') && (question.includes('sow') || question.includes('crop'))) {
        return `In summer, suitable crops often include green gram, black gram, sesame, sunflower, fodder maize, cowpea, cucurbits, and other short-duration vegetables, depending on irrigation and local climate. Choose crops based on water availability, soil type, and expected market demand. Prefer short-duration and heat-tolerant varieties where temperatures rise quickly. Check the local sowing window and recommended varieties with your nearest agriculture office before planting.`;
    }
    if (question.includes('paddy') && (question.includes('pest') || question.includes('insect'))) {
        return `For pest control in paddy, inspect the field regularly and identify whether the problem is stem borer, leaf folder, brown planthopper, or another pest before treatment. Avoid excess nitrogen, maintain proper water management, and remove badly affected tillers or leaves where practical. Pheromone traps or light traps may help reduce some pest pressure. Use only locally recommended pesticides and doses after confirming the pest and crop stage with an agriculture officer.`;
    }
    if (question.includes('leaf curl') && question.includes('chilli')) {
        return `Leaf curl in chilli is often linked to viral infection spread by whiteflies or thrips. Remove badly affected plants early, keep the field weed free, and install yellow sticky traps to reduce vector insects. Avoid excess nitrogen because it can increase tender growth that attracts pests. Use only locally recommended insect control measures after checking with your agriculture officer.`;
    }
    if ((question.includes('improve') || question.includes('better')) && question.includes('paddy')) {
        return `To improve paddy crop health, maintain proper water depth according to crop stage and avoid continuous deep flooding. Apply balanced nutrients based on soil condition, especially nitrogen, phosphorus, potassium, and zinc where needed. Keep the field free from weeds in the early growth stage and monitor regularly for stem borer, leaf folder, blast, and brown spot. Use healthy seed, proper spacing, and timely pest management for better yield.`;
    }
    if (question.includes('tomato')) {
        return `For better tomato crop performance, use healthy seedlings, maintain proper spacing, and ensure regular irrigation without waterlogging. Watch for leaf curl, blight, and sucking pests, especially on the lower leaf surface. Remove severely affected leaves and improve airflow to reduce disease pressure. Use balanced fertilizers and follow region-specific plant protection advice from local agriculture experts.`;
    }
    if (question.includes('cotton')) {
        return `For cotton crop improvement, maintain balanced fertilization, avoid moisture stress, and monitor early for sucking pests like whitefly and aphids. Remove alternate weed hosts around the field and install sticky traps where useful. Regular scouting helps detect pest pressure before it spreads. Follow integrated pest management practices and local advisory schedules for sprays and nutrient correction.`;
    }
    return `For "${input.question}", start with regular field scouting, balanced nutrition, timely irrigation, and early pest or disease monitoring. Remove severely affected leaves or plants where necessary and keep the field weed free. Avoid applying pesticides or fertilizers without confirming the correct product and dosage for your crop stage. Consult the nearest agriculture officer for location-specific treatment recommendations if the problem spreads quickly.`;
}
function parseJsonBlock(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i) ?? value.match(/```([\s\S]*?)```/i);
        const candidate = fencedMatch?.[1] ?? value.slice(value.indexOf('{'), value.lastIndexOf('}') + 1);
        if (!candidate) {
            return null;
        }
        try {
            return JSON.parse(candidate);
        }
        catch {
            return null;
        }
    }
}
async function generateGeminiText(prompt) {
    if (!env.geminiApiKey) {
        return null;
    }
    const response = await fetch(`${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        }),
    });
    if (!response.ok) {
        return null;
    }
    const data = await safeJson(response);
    return data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() || null;
}
export async function generateAgricultureAnswer(input) {
    const normalizedLanguage = normalizeLanguage(input.language);
    const responseLanguage = languageNames[normalizedLanguage] ?? 'English';
    const contextBlock = input.context?.length ? `Available context:\n- ${input.context.join('\n- ')}` : 'No verified context available.';
    const prompt = `You are an agricultural support assistant for Indian farmers.
Give a practical answer in 4 to 7 short sentences.
Focus on diagnosis steps, prevention, and safe next actions.
Do not invent exact pesticide dosages.
If the question is broad, provide improvement steps instead of saying you do not know.
Reply in ${responseLanguage}.

Question: ${input.question}
${contextBlock}`;
    if (!env.geminiApiKey) {
        return fallbackAnswer(input);
    }
    return (await generateGeminiText(prompt)) || fallbackAnswer(input);
}
export async function analyzeImageWithVision(input) {
    if (!env.openAiApiKey) {
        return null;
    }
    const cropContext = [input.providerCrop, input.cropHint].filter(Boolean).join(', ');
    const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openAiApiKey}`,
        },
        body: JSON.stringify({
            model: env.openAiModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analyze this crop image for disease or pest issues. ${cropContext ? `Known crop hints: ${cropContext}.` : ''} Respond ONLY with a valid JSON object.
Use keys: detectedCrop, diseaseName, confidence, severity, symptoms, recommendations, explanation.
confidence must be a number from 0 to 1.
severity must be low, medium, or high.
symptoms and recommendations must be arrays of short strings.
If the crop appears healthy, say "Healthy crop".`,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${input.base64Image}`,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI vision request failed:', response.status, errorText);
        return null;
    }
    const data = await safeJson(response);
    const modelText = data?.choices?.[0]?.message?.content ?? '';
    const parsed = modelText ? parseJsonBlock(modelText) : null;
    if (!parsed) {
        console.error('OpenAI vision parse failed. Raw model output:', modelText);
        return null;
    }
    return {
        detectedCrop: parsed.detectedCrop || input.providerCrop || input.cropHint || 'Unknown Crop',
        diseaseName: parsed.diseaseName || 'Unidentified issue',
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0.5))),
        severity: parsed.severity === 'high' || parsed.severity === 'medium' ? parsed.severity : 'low',
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.slice(0, 4) : ['No symptom details returned.'],
        recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.slice(0, 4)
            : ['Consult a local agronomist for field-specific treatment guidance.'],
        explanation: parsed.explanation,
    };
}
export async function explainDiagnosis(details) {
    const explanation = `${details.crop}: ${details.disease}. Symptoms include ${details.symptoms.join(', ')}. Recommended actions: ${details.recommendations.join(', ')}.`;
    if (!env.geminiApiKey) {
        return explanation;
    }
    const responseLanguage = languageNames[normalizeLanguage(details.language)] ?? 'English';
    const prompt = `Rewrite the following agricultural diagnosis explanation in ${responseLanguage}.
Keep it short, clear, and farmer-friendly.

${explanation}`;
    return (await generateGeminiText(prompt)) || explanation;
}
