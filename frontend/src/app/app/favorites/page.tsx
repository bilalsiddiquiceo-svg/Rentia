'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PropertyCard } from '@/components/PropertyCard';
import type { PropertyCardProperty } from '@/components/PropertyCard';
import { fetchFavorites, type PropertyCardItem } from '@/lib/properties';
import { useFavorites } from '@/lib/favorites';
import { useToast } from '@/components/Toast';
import { PropertyCardSkeleton } from '@/components/Skeleton';
import { PageHeading } from '@/components/PageHeading';

function toCard(p: PropertyCardItem): PropertyCardProperty {
  return {
    id: p.id,
    title: p.title,
    photos: p.photos,
    status: p.status,
    monthlyRent: p.monthlyRent,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sqft: p.sqft ?? 0,
    city: p.city,
    neighborhood: p.neighborhood ?? '',
    ownerName: p.ownerName,
  };
}

export default function FavoritesPage() {
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [properties, setProperties] = useState<PropertyCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchFavorites()
      .then((data) => {
        if (!cancelled) setProperties(data);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load favorites');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleToggleFavorite = async (id: string) => {
    const result = await toggleFavorite(id);
    if (result.success) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
      toast('Removed from favorites', 'info');
    } else {
      toast(result.error || 'Could not remove from favorites', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        title="Saved Homes"
        subtitle={
          loading
            ? 'Loading…'
            : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} you've favorited`
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
            <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>
          {loadError ? (
            <>
              <p className="mt-4 text-sm font-semibold text-slate-700">Could not load favorites</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">{loadError}</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm font-semibold text-slate-700">No favorites yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
                Tap the heart on any property card to save it here for later.
              </p>
            </>
          )}
          <Link href="/app" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D9488]">
            Browse properties
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={toCard(p)}
              isFavorited={isFavorited(p.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
