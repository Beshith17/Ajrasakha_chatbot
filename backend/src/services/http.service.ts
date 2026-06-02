export async function safeJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as T;
}

export function ensureOk(response: Response, message: string) {
  if (!response.ok) {
    throw new Error(`${message} (status ${response.status})`);
  }
}
