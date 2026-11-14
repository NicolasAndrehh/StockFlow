// Normalizo la URL base de la API para que funcione en Vercel tanto si VITE_API_URL termina en /api como si no
const rawEnvUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, '');
const BASE_URL = rawEnvUrl
  ? rawEnvUrl.endsWith('/api')
    ? rawEnvUrl
    : `${rawEnvUrl}/api`
  : 'http://localhost:5082/api';

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
      // Si la respuesta no trae cuerpo JSON continúo sin lanzar excepción
    }
  }

  if (!response.ok) {
    const errorMessage = data && data.message ? data.message : `Request failed on ${path}`;
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
