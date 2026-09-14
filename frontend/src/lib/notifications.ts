import { apiFetch } from './api';

// ── Types ─────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  hasMore: boolean;
}

// ── API calls ─────────────────────────────────────────────────

export async function getNotifications(
  params?: { before?: string; limit?: number },
): Promise<PaginatedNotifications> {
  const qs = new URLSearchParams();
  if (params?.before) qs.set('before', params.before);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<PaginatedNotifications>(
    `/notifications${query ? `?${query}` : ''}`,
  );
}

export const getUnreadNotificationCount = (() => {
  let cache: { count: number; at: number } | null = null;
  let inflight: Promise<{ count: number }> | null = null;
  const TTL = 2_000;
  return (): Promise<{ count: number }> => {
    if (cache && Date.now() - cache.at < TTL) {
      return Promise.resolve(cache);
    }
    if (!inflight) {
      inflight = apiFetch<{ count: number }>('/notifications/unread-count')
        .then((res) => {
          cache = { count: res.count, at: Date.now() };
          return res;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };
})();

export async function markNotificationRead(
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return apiFetch('/notifications/read-all', { method: 'POST' });
}
