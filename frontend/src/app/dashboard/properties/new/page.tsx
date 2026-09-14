'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PropertyForm } from '@/components/PropertyForm';
import { createProperty } from '@/lib/properties';

export default function NewPropertyPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <nav className="mb-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">New property</span>
        </nav>
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Add a new property</h1>
        <p className="mt-0.5 text-[13px] text-slate-400">
          Fill in the details below. Your listing goes live once you&apos;ve connected Stripe.
        </p>
      </div>

      <PropertyForm
        submitLabel="Create property"
        onSubmit={async (data) => {
          await createProperty(data);
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
