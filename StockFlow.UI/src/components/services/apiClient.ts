const BASE_URL = 'http://localhost:5082/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

  let data: any = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      // sin JSON en la respuesta
    }
  }

  if (!response.ok) {
    const errorMessage = (data && data.message) ? data.message : `Error en ${path}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};