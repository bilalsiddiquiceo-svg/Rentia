'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MockProperty } from '@/data/mock-properties';

interface PropertyCardProps {
  property: MockProperty;
  onToggleFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export function PropertyCard({
  property,
  onToggleFavorite,
  isFavorited = false,
}: PropertyCardProps) {
  const [imgIndex, setImgIndex] = useState(0);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10">
      {/* Photo */}
      <Link
        href={`/property/${property.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-paper-warm"
        onMouseEnter={() => setImgIndex(1)}
        onMouseLeave={() => setImgIndex(0)}
      >
        <img
          src={property.photos[imgIndex % property.photos.length]}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-70"></div>

        {/* Status badge */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {property.status === 'active' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-moss px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
              No longer available
            </span>
          )}
          {!property.bookable && property.status === 'active' && (
            <span className="rounded-full bg-paper/90 px-2.5 py-1 text-[10px] font-semibold text-rust shadow-sm">
              Not bookable yet
            </span>
          )}
        </div>

        {/* Favorite */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition-all ${
              isFavorited
                ? 'bg-clay text-white'
                : 'bg-white/85 text-ink hover:bg-white'
            }`}
          >
            <svg className="h-4.5 w-4.5" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}

        {/* Price */}
        <div className="absolute bottom-3 left-3 flex items-baseline gap-1">
          <span className="font-mono-num text-xl font-bold text-white drop-shadow-sm">
            ${property.monthlyRent.toLocaleString()}
          </span>
          <span className="text-xs text-white/80">/ month</span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="line-clamp-1 text-[15px] font-semibold text-ink transition-colors group-hover:text-clay">
            <Link href={`/property/${property.id}`}>{property.title}</Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <svg className="h-3.5 w-3.5 text-clay/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {property.neighborhood}, {property.city}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18.5-11.25V21m-12-15.75h.75c.414 0 .75.336.75.75v.75c0 .414-.336.75-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75c0-.414.336-.75.75-.75Zm7.5 0h.75c.414 0 .75.336.75.75v.75c0 .414-.336.75-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75c0-.414.336-.75.75-.75Z" />
            </svg>
            {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} bd`}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3v2.25M19.5 3v2.25M4.5 7.5v9.75A1.5 1.5 0 0 0 6 18.75h12a1.5 1.5 0 0 0 1.5-1.5V7.5m-15 0h15m-15 0V6A1.5 1.5 0 0 1 6 4.5h12A1.5 1.5 0 0 1 19.5 6v1.5" />
            </svg>
            {property.bathrooms} ba
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {property.sqft.toLocaleString()} sqft
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-moss">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clipRule="evenodd" />
            </svg>
            {property.rating}
          </span>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            by {property.ownerName.split(' ')[0]}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clipRule="evenodd" />
            </svg>
            {property.rating}
          </span>
        </div>
      </div>
    </div>
  );
}
