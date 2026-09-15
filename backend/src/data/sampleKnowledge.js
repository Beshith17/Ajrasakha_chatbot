import { KnowledgeEntry } from '../models/KnowledgeEntry.js';
const sampleKnowledge = [
    {
        question: 'How can I control stem borer in paddy?',
        answer: 'Use pheromone traps, remove affected tillers, and follow recommended insecticide dosage from local agriculture officers.',
        language: 'en',
        crop: 'paddy',
        tags: ['paddy', 'pest', 'stem borer'],
        source: 'golden',
    },
    {
        question: 'పత్తి పంటలో తెల్ల ఈగ నియంత్రణ ఎలా చేయాలి?',
        answer: 'పసుపు స్టిక్కీ ట్రాప్స్ ఉపయోగించండి, ప్రభావిత ఆకులను తొలగించండి, అవసరమైతే వ్యవసాయ అధికారుల సూచనల మేరకు మందులు వాడండి.',
        language: 'te',
        crop: 'cotton',
        tags: ['cotton', 'whitefly'],
        source: 'golden',
    },
    {
        question: 'What is the recommended spacing for tomato transplanting?',
        answer: 'Maintain about 60 cm between rows and 45 cm between plants, adjusting slightly for variety and local climate.',
        language: 'en',
        crop: 'tomato',
        tags: ['tomato', 'spacing', 'transplanting'],
        source: 'pop',
    },
    {
        question: 'How often should I irrigate chilli crop in summer?',
        answer: 'Irrigate at shorter intervals during summer and avoid waterlogging; frequency depends on soil type and crop stage.',
        language: 'en',
        crop: 'chilli',
        tags: ['chilli', 'irrigation', 'summer'],
        source: 'pop',
    },
    {
        question: 'What crops should I sow in summer season?',
        answer: 'In summer, suitable crops often include green gram, black gram, sesame, sunflower, fodder maize, cowpea, watermelon, muskmelon, cucumber, and other short-duration vegetables, depending on irrigation and local climate. Choose crops based on water availability, soil type, and market demand. Prefer short-duration and heat-tolerant varieties where temperatures rise quickly. Confirm district-specific sowing windows and recommended varieties with your nearest agriculture office.',
        language: 'en',
        crop: 'summer crops',
        tags: ['summer', 'sowing', 'season', 'crops'],
        source: 'golden',
    },
    {
        question: 'How to control pest in paddy?',
        answer: 'For pest control in paddy, inspect the field regularly and identify whether the issue is stem borer, leaf folder, brown planthopper, or another pest before treatment. Avoid excess nitrogen, maintain proper water management, and remove badly affected tillers or leaves where practical. Pheromone traps or light traps may help reduce some pest pressure. Use only locally recommended pesticides and doses after confirming the pest and crop stage with an agriculture officer.',
        language: 'en',
        crop: 'paddy',
        tags: ['paddy', 'pest', 'leaf folder', 'brown planthopper', 'stem borer'],
        source: 'golden',
    },
    {
        question: 'What is the best fertilizer for groundnut?',
        answer: 'For groundnut, use well-decomposed farmyard manure along with a balanced basal dose based on soil test recommendations. Groundnut usually responds well to phosphorus, calcium, and sulfur, and gypsum is commonly applied at pegging stage in many regions to support pod filling. Avoid excessive nitrogen because the crop can fix part of its nitrogen through nodules when seed treatment and soil conditions are good. Confirm the exact dose for your soil and variety with the local agriculture office or soil test lab.',
        language: 'en',
        crop: 'groundnut',
        tags: ['groundnut', 'fertilizer', 'gypsum', 'nutrients'],
        source: 'golden',
    },
    {
        question: 'How to make manure?',
        answer: 'To make compost manure, collect crop residues, dry leaves, cow dung, kitchen organic waste, and a little soil, then arrange them in layers in a pit or heap. Keep the material moist but not waterlogged, and turn it every few weeks to improve decomposition. Cover the pit or heap to conserve moisture and reduce nutrient loss. The compost is usually ready when it becomes dark, crumbly, and earthy in smell.',
        language: 'en',
        crop: 'organic manure',
        tags: ['manure', 'compost', 'organic', 'farmyard'],
        source: 'golden',
    },
    {
        question: 'Which fertilizers should I use for chilli crop for better growth?',
        answer: 'For chilli, use well-decomposed farmyard manure along with a balanced fertilizer program based on soil test results. The crop generally needs adequate nitrogen, phosphorus, and potash, applied in split doses instead of giving all nitrogen at once. Micronutrients such as calcium, magnesium, boron, and zinc may also help where deficiency symptoms or soil tests indicate a need. Avoid excess nitrogen because it can increase soft vegetative growth and pest or disease risk. Confirm the exact dose and timing for your local variety and soil with the agriculture department or soil testing lab.',
        language: 'en',
        crop: 'chilli',
        tags: ['chilli', 'fertilizer', 'nutrients', 'growth', 'manure'],
        source: 'golden',
    },
];
export async function seedKnowledgeIfEmpty() {
    for (const entry of sampleKnowledge) {
        await KnowledgeEntry.updateOne({
            question: entry.question,
            source: entry.source,
            language: entry.language,
        }, {
            $set: entry,
        }, {
            upsert: true,
        });
    }
}
