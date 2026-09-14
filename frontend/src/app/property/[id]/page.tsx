'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { PropertyCard } from '@/components/PropertyCard';
import type { PropertyCardProperty } from '@/components/PropertyCard';
import { fetchProperty, fetchProperties, trackView, trackClick, type PropertyCardItem } from '@/lib/properties';
import { FEATURE_ICONS, FALLBACK_FEATURE_ICON } from '@/lib/features';
import { type Property, type PropertyAvailability } from '@/types/property';
import { useFavorites } from '@/lib/favorites';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { getOrCreateConversation } from '@/lib/messages';

const LeafletMap = dynamic(
  () => import('@/components/LeafletMap').then((m) => m.LeafletMap),
  { ssr: false },
);

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNextAvailableLabel(availability: PropertyAvailability, status: string): { label: string; tone: 'available' | 'upcoming' | 'unavailable' } | null {
  if (status !== 'active') return { label: 'Not currently available', tone: 'unavailable' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openRanges = [...availability.open]
    .map((r) => ({ start: new Date(r.start), end: new Date(r.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const r of openRanges) {
    if (r.start <= today && r.end >= today) return { label: 'Available today', tone: 'available' };
  }
  for (const r of openRanges) {
    if (r.start >= today) return { label: `Available from ${formatDate(r.start)}`, tone: 'upcoming' };
  }

  const bookedRanges = [...availability.booked]
    .map((r) => ({ start: new Date(r.start), end: new Date(r.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (bookedRanges.length > 0) {
    const last = bookedRanges[bookedRanges.length - 1];
    if (last.end >= today) {
      const next = new Date(last.end);
      next.setDate(next.getDate() + 1);
      return { label: `Available from ${formatDate(next)}`, tone: 'upcoming' };
    }
  }

  return { label: 'Check availability', tone: 'upcoming' };
}

const WALK_PATH =
  'M13.75 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12.25 9l-2.75 1.75-.75 3M12.25 9l.5 3.5L15 14v3.5m-2.25-4.5L11 16.5l-1 4M12.75 12.5l2.5 2 .75 3';
const DRIVE_PATH =
  'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L5 10.6c-.6.6-1.5 1-2.4 1H2c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h2M9 17h6M7 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z';

// "Central Park — 2 min walk, City School — 5 min drive" → items.
// Returns null when the text is not in that list format so callers can fall
// back to a plain paragraph.
function parseNearbyItems(text: string | null): { name: string; time: string; drive: boolean }[] | null {
  if (!text) return null;
  const parts = text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const items: { name: string; time: string; drive: boolean }[] = [];
  for (const part of parts) {
    const m = part
      .replace(/\.+$/, '')
      .match(/^(.+?)\s+[—–-]\s*(\d+(?:\.\d+)? min (?:walk|drive))$/i);
    if (!m) return null;
    items.push({ name: m[1].trim(), time: m[2], drive: /drive/i.test(m[2]) });
  }
  return items;
}

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

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [similar, setSimilar] = useState<PropertyCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const router = useRouter();

  const handleNavigateToChat = async () => {
    if (!property) return;
    try {
      const conversation = await getOrCreateConversation(property.id);
      router.push(`/app/messages/${conversation.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start conversation', 'error');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const added = !isFavorited(id);
    const result = await toggleFavorite(id);
    if (result.success) {
      toast(added ? 'Added to favorites' : 'Removed from favorites', added ? 'success' : 'info');
    } else {
      toast(result.error || (added ? 'Could not add to favorites' : 'Could not remove from favorites'), 'error');
    }
  };

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchProperty(params.id)
      .then((p) => {
        if (cancelled) return;
        setProperty(p);
        trackView(p.id);
        fetchProperties<PropertyCardItem>({ city: p.city, light: true, limit: 4 })
          .then((data) => {
            if (cancelled) return;
            setSimilar(data.items.filter((s) => s.id !== p.id).slice(0, 3));
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Property not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-8 py-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto my-20 max-w-sm rounded-3xl border border-border bg-white p-12 text-center">
        <h1 className="text-lg font-semibold text-ink">Property not found</h1>
        <p className="mt-2 text-sm text-muted">{error || 'This listing may have been removed.'}</p>
        <Link href="/app" className="mt-8 inline-block rounded-xl bg-[#0F766E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0D9488]">
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl pb-16">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/app" className="transition-colors hover:text-[#0F766E]">Browse</Link>
        <span className="text-border">/</span>
        <span>{property.city}</span>
        {property.neighborhood && (
          <>
            <span className="text-border">/</span>
            <span className="text-ink">{property.neighborhood}</span>
          </>
        )}
      </nav>

      {/* Title + Price */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">
            {property.title}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <svg className="h-4 w-4 shrink-0 text-[#0F766E]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {property.address}
            {property.neighborhood && `, ${property.neighborhood}`}
            {`, ${property.city}`}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-border bg-white px-6 py-4 shadow-sm">
          <span className="font-mono-num text-[30px] font-bold tracking-tight text-ink">
            ${property.monthlyRent.toLocaleString()}
          </span>
          <span className="ml-1.5 text-sm font-medium text-muted">/month</span>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/5">
        <div className="relative aspect-[16/9] w-full">
          <div
            className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.6,0.3,1)]"
            style={{ transform: `translateX(-${activeImg * 100}%)` }}
          >
            {property.photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={property.title}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`h-full w-full shrink-0 object-cover transition-opacity duration-500 ${activeImg === i ? 'opacity-100' : 'opacity-100'}`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {property.photos.length > 1 && (
            <>
              <button
                onClick={() => setActiveImg((activeImg - 1 + property.photos.length) % property.photos.length)}
                disabled={property.photos.length <= 1}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                onClick={() => setActiveImg((activeImg + 1) % property.photos.length)}
                disabled={property.photos.length <= 1}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-4">
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>
              {activeImg + 1} / {property.photos.length}
            </span>
          </div>

          {property.photos.length > 1 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
              {property.photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeImg === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {property.photos.length > 1 && (
        <div className="mt-3 grid auto-cols-[92px] grid-flow-col gap-2 overflow-x-auto pb-1">
          {property.photos.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`relative shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                activeImg === i
                  ? 'ring-2 ring-[#0F766E] ring-offset-2 opacity-100'
                  : 'opacity-50 hover:opacity-90'
              }`}
            >
              <img src={src} alt="" className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main grid: Content + Sidebar */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">

        {/* Left column */}
        <div className="space-y-8">

          {/* About */}
          <section>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-ink">About this home</h2>
              {property.status === 'active' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-moss-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-moss">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                  Available
                </span>
              )}
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{property.description}</p>

            {/* Offers */}
            {property.features.length > 0 && (
              <div className="mt-7">
                <h3 className="text-[15px] font-semibold text-ink">What this place offers</h3>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {property.features.map((f) => (
                    <div
                      key={f}
                      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E]/[0.08] text-[#0F766E] transition-colors group-hover:bg-[#0F766E] group-hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_ICONS[f] ?? FALLBACK_FEATURE_ICON} />
                        </svg>
                      </div>
                      <span className="text-[14px] font-medium text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's nearby */}
            {(() => {
              const nearby = parseNearbyItems(property.neighborhoodDescription);
              if (!nearby) {
                return property.neighborhoodDescription ? (
                  <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-[14px] leading-relaxed text-muted">
                    {property.neighborhoodDescription}
                  </p>
                ) : null;
              }
              return (
                <div className="mt-7">
                  <h3 className="text-[15px] font-semibold text-ink">What&apos;s nearby</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {nearby.map((it) => (
                      <div
                        key={`${it.name}-${it.time}`}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm transition-all hover:border-[#0F766E]/25 hover:shadow-md"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                            it.drive
                              ? 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white'
                              : 'bg-moss-light text-moss group-hover:bg-moss group-hover:text-white'
                          }`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d={it.drive ? DRIVE_PATH : WALK_PATH} />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">{it.name}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                            it.drive ? 'bg-sky-50 text-sky-600' : 'bg-moss-light text-moss'
                          }`}
                        >
                          {it.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const next = getNextAvailableLabel(property.availability, property.status);
              if (!next) return null;
              const tone =
                next.tone === 'available'
                  ? { wrap: 'border-moss/25 from-moss-light/70', text: 'text-moss', pulse: true, icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' }
                  : next.tone === 'unavailable'
                  ? { wrap: 'border-rust/25 from-rust/[0.08]', text: 'text-rust', pulse: false, icon: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z' }
                  : { wrap: 'border-[#0F766E]/25 from-[#0F766E]/[0.07]', text: 'text-[#0F766E]', pulse: false, icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5' };
              return (
                <div className={`mt-6 flex items-center gap-4 rounded-2xl border bg-gradient-to-r to-white px-5 py-4 ${tone.wrap}`}>
                  <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${tone.text}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tone.icon} />
                    </svg>
                    {tone.pulse && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-moss" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-light">Next availability</p>
                    <p className="truncate text-[15px] font-bold text-ink">{next.label}</p>
                  </div>
                </div>
              );
            })()}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  value: property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}`,
                  label: 'Bedrooms',
                  icon: 'M2.25 18.75V10.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v8.25M2.25 15h19.5M2.25 18.75h19.5M7.5 8.25V6.75a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v1.5',
                },
                {
                  value: `${property.bathrooms}`,
                  label: 'Bathrooms',
                  icon: 'M4.5 12.75h15a.75.75 0 0 1 .75.75v2.25a3.75 3.75 0 0 1-3.75 3.75h-9A3.75 3.75 0 0 1 3.75 15.75V13.5a.75.75 0 0 1 .75-.75ZM4.5 12.75V9.75a2.25 2.25 0 0 1 2.25-2.25H9M5.25 12.75v-1.5a1.25 1.25 0 0 1 2.5 0v1.5',
                },
                {
                  value: `${(property.sqft ?? 0).toLocaleString()} sqft`,
                  label: 'Living area',
                  icon: 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E]/[0.08]">
                    <svg className="h-5 w-5 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight text-ink">{s.value}</p>
                    <p className="mt-0.5 text-xs text-muted">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Availability Calendar */}
          <section>
            <h2 className="text-base font-semibold text-ink">Availability</h2>
            <p className="mt-1 text-[13px] text-muted">
              Fixed 30-day rental blocks. Select your preferred move-in date.
            </p>
            <div className="mt-4">
              <AvailabilityCalendar availability={property.availability} />
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 className="text-base font-semibold text-ink">Location</h2>
            <p className="mt-1 text-[13px] text-muted">{property.address}</p>
            {property.latitude && property.longitude ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <LeafletMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  height="260px"
                />
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-muted">
                The exact location pin hasn&apos;t been set for this property yet.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Booking card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">
                Hosted by <span className="font-medium text-ink">{property.owner?.name ?? 'Owner'}</span>
              </span>
            </div>

            <div className="my-4 h-px bg-border" />

            {property.bookable ? (
              <Link
                href={`/property/${property.id}/booking`}
                className="block w-full rounded-xl bg-brand py-3 text-center text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-deep"
              >
                Book this home
              </Link>
            ) : (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-border bg-paper py-3 text-[13px] font-medium text-muted-light"
              >
                Owner hasn&apos;t connected payouts yet
              </button>
            )}

            <button
              onClick={handleNavigateToChat}
              className="mt-2.5 w-full rounded-xl border border-slate-200 py-3 text-[13px] font-medium text-slate-700 transition-all duration-200 hover:border-[#0F766E]/40 hover:bg-[#0F766E]/[0.04] hover:text-[#0F766E]"
            >
              Message owner
            </button>

            <p className="mt-4 text-center text-[11px] text-muted-light">
              Fixed 30-day blocks · No hidden fees · Secure payouts
            </p>
          </div>

          {/* Trust signals */}
          <div className="rounded-2xl border border-border bg-paper-warm/50 p-5">
            <h3 className="text-[13px] font-semibold text-ink">Why renters choose Rentia</h3>
            <ul className="mt-3 space-y-3">
              {[
                'Transparent monthly pricing — no hidden fees',
                '30-day blocks, renew or leave freely',
                'Payments held securely until after move-in',
                'Verified property owners',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] leading-snug text-muted">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">More in {property.city}</h2>
            <Link href="/app" className="text-sm font-medium text-[#0F766E] hover:text-[#0D9488]">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard
                key={p.id}
                property={toCard(p)}
                onClick={trackClick}
                isFavorited={isFavorited(p.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
