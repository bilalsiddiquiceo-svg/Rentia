'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/Skeleton';
import type { PropertyCardProperty } from '@/components/PropertyCard';
import {
  fetchProperties,
  fetchCities,
  trackClick,
  type PropertyCardItem,
} from '@/lib/properties';
import { useFavorites } from '@/lib/favorites';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 6;

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

const BEDS = ['Any', 'Studio', '1+', '2+', '3+'];

export default function AppBrowsePage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [beds, setBeds] = useState('Any');
  const [sort, setSort] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  const [properties, setProperties] = useState<PropertyCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const bedCount = beds === 'Studio' ? 0 : beds === 'Any' ? undefined : parseInt(beds);

  const { data: cities } = useSWR<string[]>('cities', fetchCities, {
    dedupingInterval: 300000,
  });

  const buildFetch = useCallback(
    (pageOffset: number, pageLimit: number) =>
      fetchProperties<PropertyCardItem>({
        city: city === 'Any' ? undefined : city,
        maxPrice: maxPrice < 5000 ? maxPrice : undefined,
        bedrooms: bedCount,
        q: search.trim() || undefined,
        sort,
        limit: pageLimit,
        offset: pageOffset,
        light: true,
      }),
    [city, maxPrice, bedCount, search, sort],
  );

  // Initial load + reload on filter change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProperties([]);
    setOffset(0);
    setHasMore(false);
    buildFetch(0, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setProperties(res.items);
        setTotal(res.total);
        setHasMore(res.total > res.items.length);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildFetch]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadingRef.current) return;
    loadingRef.current = true;
    const nextOffset = properties.length;
    const count = properties.length;
    setLoadingMore(true);
    try {
      const res = await buildFetch(nextOffset, PAGE_SIZE);
      const items = res.items;
      setProperties((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((p) => !existing.has(p.id))];
      });
      setTotal(res.total);
      setHasMore(res.total > count + items.length);
    } catch {
      // ignore
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [buildFetch, loadingMore, hasMore, properties.length]);

  // Load the next page as the user scrolls near the bottom, and keep filling
  // in more homes when the page hasn't yet grown past the viewport.
  useEffect(() => {
    const tryLoadMore = () => {
      if (loadingRef.current) return;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      const notEnoughContent = document.body.offsetHeight <= window.innerHeight;
      if (nearBottom || notEnoughContent) loadMore();
    };
    window.addEventListener('scroll', tryLoadMore, { passive: true });
    window.addEventListener('resize', tryLoadMore, { passive: true });
    tryLoadMore();
    return () => {
      window.removeEventListener('scroll', tryLoadMore);
      window.removeEventListener('resize', tryLoadMore);
    };
  }, [loadMore]);

  const handleToggleFavorite = async (id: string) => {
    const added = !isFavorited(id);
    const result = await toggleFavorite(id);
    if (result.success) {
      toast(added ? 'Added to favorites' : 'Removed from favorites', added ? 'success' : 'info');
    } else {
      toast(result.error || (added ? 'Could not add to favorites' : 'Could not remove favorites'), 'error');
    }
  };

  const activeFilters = [
    city !== 'Any' ? city : null,
    beds !== 'Any' ? beds : null,
    maxPrice < 5000 ? `Under $${maxPrice.toLocaleString()}` : null,
    sort !== 'newest' ? sort : null,
  ].filter(Boolean);

  const resetFilters = () => { setSearch(''); setCity('Any'); setMaxPrice(5000); setBeds('Any'); setSort('newest'); };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="shrink-0">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[34px]">
              Find your next home
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {loading ? 'Loading homes…' : `${properties.length} ${properties.length === 1 ? 'home' : 'homes'} available across your cities`}
            </p>
          </div>
          <div className="flex w-full items-center gap-3 lg:max-w-[560px]">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by city, neighborhood, or address…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[15px] text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  filtersOpen || activeFilters.length > 0
                    ? 'border-[#0F766E]/30 bg-[#0F766E]/[0.06] text-[#0F766E]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                Filters
                {activeFilters.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                    {activeFilters.length}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Filters</h3>
                      {activeFilters.length > 0 && (
                        <button onClick={resetFilters} className="text-xs font-medium text-[#0F766E] hover:underline">Reset all</button>
                      )}
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">City</label>
                        <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F766E]">
                          <option>Any city</option>
                          {(cities ?? []).map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Bedrooms</label>
                        <div className="flex flex-wrap gap-2">
                          {BEDS.map((b) => (
                            <button key={b} onClick={() => setBeds(b)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${beds === b ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          <span>Max price</span>
                          <span className="normal-case text-slate-700">${maxPrice.toLocaleString()}</span>
                        </label>
                        <input type="range" min={1500} max={5000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#0F766E]" />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Sort by</label>
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F766E]">
                          <option value="newest">Newest</option>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                        </select>
                      </div>
                    </div>

                    <button onClick={() => setFiltersOpen(false)} className="mt-5 w-full rounded-xl bg-[#0F766E] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D9488]">
                      Show results
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-[#0F766E]/[0.08] px-3 py-1 text-xs font-medium text-[#0F766E]">
                {f}
              </span>
            ))}
            <button onClick={resetFilters} className="text-xs font-medium text-slate-400 hover:text-slate-600">Clear</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <p className="text-sm font-medium text-slate-600">No properties match your filters</p>
          <button onClick={resetFilters} className="mt-3 text-sm font-semibold text-[#0F766E] hover:underline">Reset filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={toCard(p)}
              onClick={trackClick}
              isFavorited={isFavorited(p.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
      {loadingMore && (
        <div className="mt-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
        </div>
      )}
      {!loading && !loadingMore && hasMore && (
        <div className="mt-8 text-center text-xs text-slate-400">
          Scroll for more homes…
        </div>
      )}
    </div>
  );
}
