'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { DashboardSkeleton } from '@/components/Skeleton';

export function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.role !== 'owner') {
      router.replace('/become-owner');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || user.role !== 'owner') {
    return null;
  }

  return <>{children}</>;
}
