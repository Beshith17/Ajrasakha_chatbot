import { Schema, model } from 'mongoose';
const reviewQueueItemSchema = new Schema({
    sessionId: {
        type: String,
        trim: true,
    },
    question: {
        type: String,
        required: true,
        trim: true,
    },
    answer: {
        type: String,
        required: true,
        trim: true,
    },
    language: {
        type: String,
        required: true,
        default: 'en',
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
}, {
    timestamps: true,
});
reviewQueueItemSchema.index({ status: 1, createdAt: -1 });
export const ReviewQueueItem = model('ReviewQueueItem', reviewQueueItemSchema);
