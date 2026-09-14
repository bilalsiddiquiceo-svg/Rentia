import { apiFetch } from './api';

export interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
}

export interface OwnerWallet {
  connected: boolean;
  pending: number;
  approved: number;
}

export interface OwnerDispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  amount: number;
  period_start: string;
  property: { id: string; title: string };
}

export async function connectStripe() {
  return apiFetch<{ url: string }>('/stripe/connect', { method: 'POST' });
}

export async function getStripeConnectStatus() {
  return apiFetch<StripeConnectStatus>('/stripe/connect/status');
}

export async function fetchWallet() {
  return apiFetch<OwnerWallet>('/owner/wallet');
}

export async function fetchDisputes() {
  return apiFetch<OwnerDispute[]>('/owner/disputes');
}
