export interface LanguageOption {
  code: string;
  label: string;
}

export type UserRole = 'farmer' | 'expert';
export type SessionStatus = 'open' | 'answered' | 'ended';
export type ChatThreadKind = 'chat' | 'session';

export interface AppUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
}

export interface UserProfile {
  role: UserRole;
  displayName: string;
  sessionCode?: string;
}

export interface ChatMessage {
  messageId: string;
  role: UserRole | 'assistant';
  text: string;
  language: string;
  senderName?: string;
  source?: 'ai' | 'expert';
  createdAt: string;
}

export interface ChatSessionSummary {
  _id: string;
  sessionName: string;
  farmerName?: string;
  expertName?: string;
  kind: ChatThreadKind;
  sessionCode: string;
  preferredLanguage: string;
  status: SessionStatus;
  updatedAt: string;
  lastMessagePreview?: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface SessionEnvelope {
  sessionId: string;
  session: ChatSessionSummary;
  messages: ChatMessage[];
}

export interface LiveNotification {
  sessionId: string;
  sessionCode: string;
  title: string;
  preview: string;
  actorRole: UserRole;
  actorName?: string;
  createdAt: string;
}

export interface BrowserSpeechRecognitionResultAlternative {
  transcript: string;
}

export interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionResultAlternative;
}

export interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

export interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

export interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: Event) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

export interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}
