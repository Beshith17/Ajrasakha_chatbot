export async function safeJson(response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    return (await response.json());
}
export function ensureOk(response, message) {
    if (!response.ok) {
        throw new Error(`${message} (status ${response.status})`);
    }
}
