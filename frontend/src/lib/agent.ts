import { apiFetch } from './api';
import type { Property } from '@/types/property';

export interface AgentStatus {
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AgentPayment {
  id: string;
  status: string;
  date: string | null;
  amount: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  subscription: string | null;
}

export interface AgentChatReply {
  reply: string;
}

export type ListingProposalType = 'edit' | 'status' | 'images' | 'create';

export interface ListingProposal {
  type: ListingProposalType;
  propertyId: string;
  propertyTitle: string;
  current?: Record<string, string | number | null>;
  changes?: Record<string, string | number | null>;
  status?: 'active' | 'inactive';
  add?: string[];
  removeIndices?: number[];
  currentPhotos?: string[];
  resultPhotos?: string[];
  title?: string;
  description?: string;
  neighborhoodDescription?: string | null;
  neighborhood?: string | null;
  address?: string;
  city?: string;
  monthlyRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  photos?: string[];
  features?: string[];
}

export interface ChatLocation {
  latitude: number;
  longitude: number;
}

export interface AgentHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface PaginatedAgentHistory {
  items: AgentHistoryItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PresignUpload {
  uploadUrl: string;
  path: string;
  publicUrl: string;
}

export const getAgentStatus = (() => {
  let cache: { status: AgentStatus; at: number } | null = null;
  let inflight: Promise<AgentStatus> | null = null;
  const TTL = 30_000;
  return (force = false): Promise<AgentStatus> => {
    if (!force && cache && Date.now() - cache.at < TTL) {
      return Promise.resolve(cache.status);
    }
    if (!inflight) {
      inflight = apiFetch<AgentStatus>('/agent/status')
        .then((s) => {
          cache = { status: s, at: Date.now() };
          return s;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };
})();

export const getAgentStatusFresh = () => getAgentStatus(true);

const agentHistoryInflight = new Map<string, Promise<PaginatedAgentHistory>>();

export const getAgentHistory = (params?: { before?: string; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.before) qs.set('before', params.before);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const url = `/agent/history${query ? `?${query}` : ''}`;

  if (agentHistoryInflight.has(url)) {
    return agentHistoryInflight.get(url) as Promise<PaginatedAgentHistory>;
  }

  const promise = apiFetch<PaginatedAgentHistory>(url).finally(() => {
    agentHistoryInflight.delete(url);
  });
  agentHistoryInflight.set(url, promise);
  return promise;
};

export const subscribeToAgent = () =>
  apiFetch<{ url: string }>('/agent/subscribe', { method: 'POST' });

export const fetchAgentPayments = (() => {
  let cache: { items: AgentPayment[]; at: number } | null = null;
  let inflight: Promise<{ items: AgentPayment[] }> | null = null;
  const TTL = 60_000;
  return (): Promise<{ items: AgentPayment[] }> => {
    if (cache && Date.now() - cache.at < TTL) {
      return Promise.resolve({ items: cache.items });
    }
    if (!inflight) {
      inflight = apiFetch<{ items: AgentPayment[] }>('/agent/payments-history')
        .then((res) => {
          cache = { items: res.items, at: Date.now() };
          return res;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };
})();
export const cancelAgentSubscription = () =>
  apiFetch<AgentStatus>('/agent/cancel-subscription', { method: 'POST' });

export const sendAgentChat = (message: string, location?: ChatLocation, photos?: string[]) =>
  apiFetch<AgentChatReply>('/agent/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(location ? { location } : {}),
      ...(photos && photos.length > 0 ? { photos } : {}),
    }),
  });

export const confirmListingEdit = (
  propertyId: string,
  changes: Record<string, string | number | null>,
) =>
  apiFetch<Property>('/agent/confirm-listing-edit', {
    method: 'POST',
    body: JSON.stringify({ propertyId, changes }),
  });

export const confirmListingCreate = (p: ListingProposal) =>
  apiFetch<Property>('/agent/confirm-listing-create', {
    method: 'POST',
    body: JSON.stringify({
      title: p.title,
      description: p.description,
      ...(p.neighborhoodDescription ? { neighborhoodDescription: p.neighborhoodDescription } : {}),
      address: p.address,
      city: p.city,
      ...(p.neighborhood ? { neighborhood: p.neighborhood } : {}),
      monthlyRent: p.monthlyRent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      ...(p.sqft ? { sqft: p.sqft } : {}),
      latitude: p.latitude ?? undefined,
      longitude: p.longitude ?? undefined,
      photos: p.photos,
      ...(p.features?.length ? { features: p.features } : {}),
    }),
  });

export const confirmStatusChange = (
  propertyId: string,
  status: 'active' | 'inactive',
) =>
  apiFetch<Property>('/agent/confirm-status-change', {
    method: 'POST',
    body: JSON.stringify({ propertyId, status }),
  });

export const confirmImagesChange = (propertyId: string, photos: string[]) =>
  apiFetch<Property>('/agent/confirm-images-change', {
    method: 'POST',
    body: JSON.stringify({ propertyId, photos }),
  });

export const cancelAgentProposal = () =>
  apiFetch<{ cancelled: boolean }>('/agent/cancel-proposal', { method: 'POST' });

export const resetAgentConversation = () =>
  apiFetch<{ ok: boolean }>('/agent/reset-conversation', { method: 'POST' });

export const presignPropertyUpload = (fileName: string, contentType: string) =>
  apiFetch<PresignUpload>('/properties/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  });
