import { Schema, model } from 'mongoose';

export interface IReviewQueueItem {
  sessionId?: string;
  question: string;
  answer: string;
  language: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const reviewQueueItemSchema = new Schema<IReviewQueueItem>(
  {
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
  },
  {
    timestamps: true,
  },
);

reviewQueueItemSchema.index({ status: 1, createdAt: -1 });

export const ReviewQueueItem = model<IReviewQueueItem>('ReviewQueueItem', reviewQueueItemSchema);
