import { Schema, model } from 'mongoose';

export type KnowledgeSource = 'golden' | 'pop';

export interface IKnowledgeEntry {
  question: string;
  answer: string;
  language: string;
  crop?: string;
  tags: string[];
  source: KnowledgeSource;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeEntrySchema = new Schema<IKnowledgeEntry>(
  {
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
    crop: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      enum: ['golden', 'pop'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

knowledgeEntrySchema.index(
  { question: 'text', answer: 'text', crop: 'text', tags: 'text' },
  {
    default_language: 'none',
    language_override: 'mongoTextLanguage',
  },
);
knowledgeEntrySchema.index({ source: 1, language: 1 });

export const KnowledgeEntry = model<IKnowledgeEntry>('KnowledgeEntry', knowledgeEntrySchema);
