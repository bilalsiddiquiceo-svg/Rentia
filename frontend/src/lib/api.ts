const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<RefreshResult | null> | null = null;

export const getAccessToken = () => memoryAccessToken;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

interface FetchOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

interface RefreshResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: 'user' | 'owner';
    phone?: string | null;
    name?: string | null;
  };
}

export async function refreshSession(): Promise<RefreshResult | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        memoryAccessToken = data.accessToken;
        return data as RefreshResult;
      }
      memoryAccessToken = null;
      return null;
    } catch {
      memoryAccessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuthRetry = false, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (restOptions.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (memoryAccessToken) {
    headers['Authorization'] = `Bearer ${memoryAccessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers,
    credentials: 'include', // Send refresh token httpOnly cookie
  });

  // If unauthorized and we haven't retried yet, attempt silent refresh
  if (response.status === 401 && !skipAuthRetry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    const result = await refreshSession();

    if (result) {
      // Retry original request with new access token
      return apiFetch<T>(endpoint, {
        ...options,
        skipAuthRetry: true,
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || 'An unexpected error occurred';
    const error = new Error(errorMessage) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}
