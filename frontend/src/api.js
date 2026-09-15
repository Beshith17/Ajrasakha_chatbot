const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
async function request(path, init) {
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
            const payload = (await response.json());
            throw new Error(payload.message ?? `Request failed with status ${response.status}`);
        }
        throw new Error(`Request failed with status ${response.status}`);
    }
    if (response.status === 204) {
        return undefined;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        return undefined;
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined);
}
export function signupWithPassword(payload) {
    return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export function signinWithPassword(payload) {
    return request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export function fetchLanguages() {
    return request('/languages');
}
export function createSession(payload) {
    return request('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export function joinSession(payload) {
    return request('/chat/sessions/join', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export function fetchSessions(params) {
    const search = new URLSearchParams();
    if (params?.role) {
        search.set('role', params.role);
    }
    if (params?.ownerUid) {
        search.set('ownerUid', params.ownerUid);
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request(`/chat/sessions${suffix}`);
}
export function fetchSession(sessionId) {
    return request(`/chat/sessions/${sessionId}`);
}
export function deleteSession(sessionId) {
    return request(`/chat/sessions/${sessionId}`, {
        method: 'DELETE',
    });
}
export function endSession(sessionId) {
    return request(`/chat/sessions/${sessionId}/end`, {
        method: 'POST',
    });
}
export function clearSessionChat(sessionId) {
    return request(`/chat/sessions/${sessionId}/clear`, {
        method: 'POST',
    });
}
export function sendFarmerMessage(payload) {
    return request('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export function sendExpertReply(sessionId, payload) {
    return request(`/chat/sessions/${sessionId}/replies`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function transcribeAudio(payload) {
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
    return response.json();
}
export async function synthesizeSpeech(payload) {
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
    return response.json();
}
