import { Schema, model, Types } from 'mongoose';

export type ChatParticipantRole = 'farmer' | 'expert' | 'assistant';
export type ChatSessionStatus = 'open' | 'answered' | 'ended';
export type ChatSessionKind = 'chat' | 'session';

export interface IChatMessage {
  messageId: string;
  role: ChatParticipantRole;
  text: string;
  language: string;
  senderName?: string;
  source?: 'ai' | 'expert';
  createdAt: Date;
}

export interface IChatSession {
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  farmerName?: string;
  expertName?: string;
  kind: ChatSessionKind;
  sessionCode: string;
  sessionName: string;
  preferredLanguage: string;
  status: ChatSessionStatus;
  messages: Types.DocumentArray<IChatMessage>;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    messageId: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['farmer', 'expert', 'assistant'],
      required: true,
    },
    text: {
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
    senderName: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['ai', 'expert'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    ownerUid: {
      type: String,
      trim: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
    },
    farmerName: {
      type: String,
      trim: true,
    },
    expertName: {
      type: String,
      trim: true,
    },
    kind: {
      type: String,
      enum: ['chat', 'session'],
      default: 'chat',
      required: true,
      index: true,
    },
    sessionCode: {
      type: String,
      required: true,
      trim: true,
    },
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      required: true,
      default: 'en',
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'ended'],
      default: 'open',
      required: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    lastMessagePreview: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

chatSessionSchema.index({ updatedAt: -1 });
chatSessionSchema.index(
  { sessionCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sessionCode: {
        $type: 'string',
      },
    },
  },
);

export const ChatSession = model<IChatSession>('ChatSession', chatSessionSchema);
