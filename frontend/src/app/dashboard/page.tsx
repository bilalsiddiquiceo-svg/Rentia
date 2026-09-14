import { serverFetch } from '@/lib/server-api';
import DashboardClient, { type DashboardInitialData } from './DashboardClient';
import type { OwnerWallet, OwnerDispute } from '@/lib/stripe';
import type { OwnerStats, OwnerPropertyCard } from '@/lib/properties';

export default async function OwnerDashboardPage() {
  const [properties, stats, stripeStatus, wallet, disputes] = await Promise.all([
    serverFetch<OwnerPropertyCard[]>('/owner/properties/cards'),
    serverFetch<OwnerStats>('/owner/properties/stats'),
    serverFetch<{ connected: boolean; accountId: string | null }>('/stripe/connect/status'),
    serverFetch<OwnerWallet>('/owner/wallet'),
    serverFetch<OwnerDispute[]>('/owner/disputes'),
  ]);

  const initialData: DashboardInitialData = {
    properties,
    stats,
    stripeStatus,
    wallet,
    disputes,
  };

  return <DashboardClient initialData={initialData} />;
}
