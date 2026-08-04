const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let memoryAccessToken: string | null = null;

export const getAccessToken = () => memoryAccessToken;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

interface FetchOptions extends RequestInit {
  skipAuthRetry?: boolean;
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
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setAccessToken(data.accessToken);

        // Retry original request with new access token
        return apiFetch<T>(endpoint, {
          ...options,
          skipAuthRetry: true,
        });
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || 'An unexpected error occurred';
    throw new Error(errorMessage);
  }

  return response.json();
}
