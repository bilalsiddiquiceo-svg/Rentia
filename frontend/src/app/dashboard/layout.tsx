'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { RequireOwner } from '@/components/RequireOwner';
import { AppLayout } from '@/components/AppLayout';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireOwner>
        <AppLayout>{children}</AppLayout>
      </RequireOwner>
    </RequireAuth>
  );
}
