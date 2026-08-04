'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function OwnerDashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-[#5C6560]">
        Loading dashboard credentials...
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white border border-[#9C3B2E]/30 rounded-lg text-center">
        <h2 className="text-xl font-bold text-[#9C3B2E]">Access Restricted</h2>
        <p className="text-sm text-[#5C6560] mt-2 mb-6">
          This dashboard is reserved for verified Property Owners.
        </p>
        <Link
          href="/become-owner"
          className="inline-block px-6 py-2.5 bg-[#B4652B] text-[#F6F4EF] font-medium text-sm rounded hover:bg-[#9E5522]"
        >
          Apply to Become an Owner
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-[#1C2321] text-[#F6F4EF] p-8 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4B5D45]"></span>
            <span className="text-xs uppercase font-mono tracking-widest text-[#4B5D45] font-bold">
              Owner Portal Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Property Owner Dashboard</h1>
          <p className="text-sm text-[#E2DDD5]/70 mt-1">
            Logged in as <span className="font-mono text-[#F6F4EF]">{user.email}</span>
          </p>
        </div>

        <Link
          href="/dashboard/properties/new"
          className="px-5 py-2.5 bg-[#B4652B] hover:bg-[#9E5522] text-[#F6F4EF] font-medium text-sm rounded transition-colors self-start md:self-auto"
        >
          + Add New Property (Phase 2)
        </Link>
      </div>

      {/* Wallet Card Readout Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2DDD5] p-6 rounded-lg">
          <span className="text-xs uppercase font-bold tracking-wider text-[#5C6560]">Pending Balance</span>
          <div className="text-3xl font-bold font-mono-num text-[#1C2321] mt-2">$0.00</div>
          <p className="text-xs text-[#5C6560] mt-2">Rent held in 3-day hold window before auto-release.</p>
        </div>

        <div className="bg-white border border-[#E2DDD5] p-6 rounded-lg">
          <span className="text-xs uppercase font-bold tracking-wider text-[#4B5D45]">Approved Balance</span>
          <div className="text-3xl font-bold font-mono-num text-[#4B5D45] mt-2">$0.00</div>
          <p className="text-xs text-[#5C6560] mt-2">Transferred to Stripe Connect payout account.</p>
        </div>
      </div>

      {/* Listings Section Stub */}
      <div className="bg-white border border-[#E2DDD5] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1C2321]">Your Properties</h2>
          <span className="text-xs font-mono bg-[#F6F4EF] text-[#5C6560] px-2.5 py-1 rounded">
            0 Listings
          </span>
        </div>
        <div className="p-8 border border-dashed border-[#E2DDD5] rounded-lg text-center">
          <p className="text-sm text-[#5C6560]">No property listings added yet.</p>
          <p className="text-xs text-[#5C6560]/70 mt-1">
            Property listings & availability strips will be configured in Phase 2.
          </p>
        </div>
      </div>
    </div>
  );
}
