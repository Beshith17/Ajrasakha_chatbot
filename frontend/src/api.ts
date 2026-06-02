import type {
  AppUser,
  ChatSessionDetail,
  ChatSessionSummary,
  LanguageOption,
  SessionEnvelope,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? `Request failed with status ${response.status}`);
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface AuthResponse {
  user: AppUser;
  contactInfo: {
    email?: string;
    phone?: string;
  };
}

export function signupWithPassword(payload: { identifier: string; password: string; displayName?: string }) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signinWithPassword(payload: { identifier: string; password: string }) {
  return request<AuthResponse>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchLanguages() {
  return request<LanguageOption[]>('/languages');
}

export function createSession(payload: {
  sessionName: string;
  farmerName?: string;
  language: string;
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}) {
  return request<ChatSessionDetail>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function joinSession(payload: {
  sessionCode: string;
  farmerName?: string;
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}) {
  return request<ChatSessionDetail>('/chat/sessions/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSessions(params?: { role?: 'farmer' | 'expert'; ownerUid?: string }) {
  const search = new URLSearchParams();

  if (params?.role) {
    search.set('role', params.role);
  }

  if (params?.ownerUid) {
    search.set('ownerUid', params.ownerUid);
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request<ChatSessionSummary[]>(`/chat/sessions${suffix}`);
}

export function fetchSession(sessionId: string) {
  return request<ChatSessionDetail>(`/chat/sessions/${sessionId}`);
}

export function deleteSession(sessionId: string) {
  return request<void>(`/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function endSession(sessionId: string) {
  return request<SessionEnvelope>(`/chat/sessions/${sessionId}/end`, {
    method: 'POST',
  });
}

export function clearSessionChat(sessionId: string) {
  return request<SessionEnvelope>(`/chat/sessions/${sessionId}/clear`, {
    method: 'POST',
  });
}

export function sendFarmerMessage(payload: {
  question: string;
  language: string;
  farmerName?: string;
  sessionId?: string;
  sessionCode?: string;
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}) {
  return request<SessionEnvelope>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendExpertReply(sessionId: string, payload: { answer: string; language: string; expertName?: string }) {
  return request<SessionEnvelope>(`/chat/sessions/${sessionId}/replies`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function transcribeAudio(payload: { audio: Blob; language: string }) {
  const formData = new FormData();
  formData.append('audio', payload.audio, 'voice-input.webm');
  formData.append('language', payload.language);

  const response = await fetch(`${API_BASE_URL}/speech/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<{ transcript: string }>;
}

export async function synthesizeSpeech(payload: { text: string; language: string }) {
  const response = await fetch(`${API_BASE_URL}/speech/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<{ audioBase64: string }>;
}
