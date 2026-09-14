import { apiFetch } from './api';
import type { Lease, Payment } from '@/types/lease';

export async function createLease(data: {
  property_id: string;
  start_date: string;
  months: number;
}) {
  return apiFetch<Lease>('/leases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const fetchMyLeases = (() => {
  let inflight: Promise<Lease[]> | null = null;
  return (): Promise<Lease[]> => {
    if (!inflight) {
      inflight = apiFetch<Lease[]>('/leases/mine').finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
})();

export const fetchOwnerLeases = (() => {
  let inflight: Promise<Lease[]> | null = null;
  return (): Promise<Lease[]> => {
    if (!inflight) {
      inflight = apiFetch<Lease[]>('/owner/leases').finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
})();

export async function cancelLease(id: string) {
  return apiFetch<{ ok: boolean }>(`/leases/${id}/cancel`, { method: 'PATCH' });
}

export async function fetchLease(id: string) {
  return apiFetch<Lease>(`/leases/${id}`);
}

export async function fetchLeasePayments(id: string) {
  return apiFetch<Payment[]>(`/leases/${id}/payments`);
}

export async function createCheckoutSession(leaseId: string) {
  return apiFetch<{ url: string }>('/checkout', {
    method: 'POST',
    body: JSON.stringify({ lease_id: leaseId }),
  });
}

export async function renewLease(leaseId: string, months = 1) {
  return apiFetch<{ ok: boolean; end_date: string }>(`/leases/${leaseId}/renew`, {
    method: 'POST',
    body: JSON.stringify({ months }),
  });
}
