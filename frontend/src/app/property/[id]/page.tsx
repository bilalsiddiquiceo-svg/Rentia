'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { MOCK_PROPERTIES } from '@/data/mock-properties';
import { AvailabilityStrip } from '@/components/AvailabilityStrip';
import { PropertyCard } from '@/components/PropertyCard';
import { RequireAuth } from '@/components/RequireAuth';

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const property = MOCK_PROPERTIES.find((p) => p.id === params.id);
  const [activeImg, setActiveImg] = useState(0);

  if (!property) {
    return (
      <div className="mx-auto my-20 max-w-md rounded-2xl border border-border bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-ink">Property not found</h1>
        <p className="mt-2 text-sm text-muted">This listing may have been removed.</p>
        <Link href="/app" className="mt-6 inline-block rounded-lg bg-clay px-5 py-2.5 text-sm font-semibold text-white hover:bg-clay-hover">
          Back to Browse
        </Link>
      </div>
    );
  }

  const similar = MOCK_PROPERTIES.filter(
    (p) => p.id !== property.id && p.city === property.city,
  ).slice(0, 3);

  return (
    <div className="pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/app" className="hover:text-clay">Browse</Link>
        <span>/</span>
        <span>{property.city}</span>
        <span>/</span>
        <span className="text-ink">{property.neighborhood}</span>
      </nav>

      {/* Title row */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {property.title}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <svg className="h-4 w-4 text-clay/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {property.address} · {property.neighborhood}, {property.city}
          </p>
        </div>
        <div className="flex items-baseline gap-1 rounded-xl bg-paper-warm px-4 py-2.5 border border-border">
          <span className="font-mono-num text-2xl font-bold text-ink">
            ${property.monthlyRent.toLocaleString()}
          </span>
          <span className="text-sm text-muted">/month</span>
        </div>
      </div>

      {/* Gallery + booking card */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <img
              src={property.photos[activeImg]}
              alt={property.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          {property.photos.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {property.photos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`overflow-hidden rounded-lg border-2 transition-all ${
                    activeImg === i ? 'border-clay' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-20 w-28 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Booking card */}
        <aside className="h-fit rounded-2xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-moss">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clipRule="evenodd" />
              </svg>
              {property.rating} · {property.reviewCount} reviews
            </span>
            <span className="text-xs font-medium text-muted">Hosted by {property.ownerName}</span>
          </div>

          <div className="my-4 border-t border-border/70"></div>

          <AvailabilityStrip segments={property.availability} />

          <div className="mt-5 space-y-2.5">
            {property.bookable ? (
              <button className="w-full rounded-xl bg-clay py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-clay-hover">
                Book this home
              </button>
            ) : (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-xl bg-border py-3 text-sm font-semibold text-muted-light"
              >
                Owner isn't accepting bookings yet
              </button>
            )}
            <button className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-ink transition-colors hover:border-clay hover:text-clay">
              Message owner
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-light">
            Fixed 30-day rental blocks · No hidden fees · Secure payouts
          </p>
        </aside>
      </div>

      {/* Details */}
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-ink">About this home</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{property.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Bedrooms`, icon: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18.5-11.25V21m-12-15.75h.75c.414 0 .75.336.75.75v.75c0 .414-.336.75-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75c0-.414.336-.75.75-.75Zm7.5 0h.75c.414 0 .75.336.75.75v.75c0 .414-.336.75-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75c0-.414.336-.75.75-.75Z' },
                { label: `${property.bathrooms} Bathrooms`, icon: 'M4.5 3v2.25M19.5 3v2.25M4.5 7.5v9.75A1.5 1.5 0 0 0 6 18.75h12a1.5 1.5 0 0 0 1.5-1.5V7.5m-15 0h15m-15 0V6A1.5 1.5 0 0 1 6 4.5h12A1.5 1.5 0 0 1 19.5 6v1.5' },
                { label: `${property.sqft.toLocaleString()} sqft`, icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-paper px-3 py-3.5 text-center">
                  <svg className="mx-auto h-5 w-5 text-clay" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                  <p className="mt-1.5 text-xs font-medium text-ink">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-ink">Availability</h2>
            <p className="mt-1 text-xs text-muted">
              Green blocks are open for booking. Fixed 30-day blocks — move in on the 1st of any open month.
            </p>
            <div className="mt-4 max-w-md">
              <AvailabilityStrip segments={property.availability} />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-paper-warm p-5">
          <h3 className="text-sm font-semibold text-ink">What guests love</h3>
          <ul className="mt-3 space-y-2.5">
            {[
              'Transparent monthly pricing — no hidden fees',
              'Fixed 30-day rental blocks, renew or leave freely',
              'Payments held securely until after move-in',
              'Verified property owners with background checks',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">More homes in {property.city}</h2>
            <Link href="/app" className="text-sm font-semibold text-clay hover:text-clay-hover">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
