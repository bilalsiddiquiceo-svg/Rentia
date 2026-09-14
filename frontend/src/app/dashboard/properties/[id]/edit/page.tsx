'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PropertyForm } from '@/components/PropertyForm';
import { fetchOwnerProperty, updateProperty, deleteProperty } from '@/lib/properties';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import type { Property } from '@/types/property';

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetchOwnerProperty(params.id)
      .then(setProperty)
      .catch((err) => setError(err?.message || 'Property not found'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!property) return;
    if (!window.confirm('Delete this property? This permanently removes it and its photos.')) return;
    setDeleting(true);
    try {
      await deleteProperty(property.id);
      toast('Property deleted', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete property', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Property not found</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load property.'}</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <nav className="mb-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">Edit property</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Edit property</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">{property.title}</p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <PropertyForm
        initialData={{
          title: property.title,
          description: property.description,
          address: property.address,
          city: property.city,
           neighborhood: property.neighborhood ?? '',
           neighborhood_description: property.neighborhoodDescription ?? '',
          monthly_rent: property.monthlyRent,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sqft: property.sqft ?? '',
           photos: property.photos,
           features: property.features ?? [],
           latitude: property.latitude,
          longitude: property.longitude,
        }}
        submitLabel="Save changes"
        onSubmit={async (data) => {
          await updateProperty(property.id, data);
          toast('Changes saved', 'success');
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
