import { Schema, model } from 'mongoose';
const diagnosisReportSchema = new Schema({
    farmerName: {
        type: String,
        trim: true,
    },
    imageName: {
        type: String,
        required: true,
        trim: true,
    },
    cropHint: {
        type: String,
        trim: true,
    },
    detectedCrop: {
        type: String,
        required: true,
        trim: true,
    },
    diseaseName: {
        type: String,
        required: true,
        trim: true,
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
    },
    symptoms: {
        type: [String],
        default: [],
    },
    recommendations: {
        type: [String],
        default: [],
    },
    explanation: {
        type: String,
        trim: true,
    },
    source: {
        type: String,
        enum: ['heuristic-demo', 'plant-id', 'openai-vision'],
        default: 'heuristic-demo',
    },
}, {
    timestamps: true,
});
diagnosisReportSchema.index({ createdAt: -1 });
export const DiagnosisReport = model('DiagnosisReport', diagnosisReportSchema);
