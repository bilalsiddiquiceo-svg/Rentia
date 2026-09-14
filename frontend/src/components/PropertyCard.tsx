'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface PropertyCardProperty {
  id: string;
  title: string;
  photos: string[];
  status: 'active' | 'inactive';
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  city: string;
  neighborhood: string;
  rating?: number;
  reviewCount?: number;
  ownerName: string;
}

interface PropertyCardProps {
  property: PropertyCardProperty;
  onToggleFavorite?: (id: string) => void;
  isFavorited?: boolean;
  onClick?: (id: string) => void;
}

export function PropertyCard({
  property,
  onToggleFavorite,
  isFavorited = false,
  onClick,
}: PropertyCardProps) {
  const [imgIndex, setImgIndex] = useState(0);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)]">
      <Link
        href={`/property/${property.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
        onMouseEnter={() => setImgIndex(1)}
        onMouseLeave={() => setImgIndex(0)}
        onClick={() => onClick?.(property.id)}
      >
        <img
          src={property.photos[imgIndex % property.photos.length]}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {property.status === 'active' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/90 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              Unavailable
            </span>
          )}
        </div>

        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 ${
              isFavorited
                ? 'bg-rose-500 text-white scale-110'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-rose-500 hover:scale-110'
            }`}
          >
            <svg className="h-5 w-5" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-mono-num text-xl font-bold text-white drop-shadow-md">
              ${property.monthlyRent.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-white/70">/mo</span>
          </div>
          {property.photos.length > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>
              {property.photos.length}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-800 transition-colors group-hover:text-[#0F766E]">
            <Link href={`/property/${property.id}`} onClick={() => onClick?.(property.id)}>
              {property.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {property.neighborhood}{property.neighborhood && ','} {property.city}
          </p>
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.25 18.75V10.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v8.25" />
              <path d="M2.25 15h19.5M2.25 18.75h19.5" />
              <path d="M7.5 8.25V6.75a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v1.5" />
            </svg>
            {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} bed`}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 12.75h15a.75.75 0 0 1 .75.75v2.25a3.75 3.75 0 0 1-3.75 3.75h-9A3.75 3.75 0 0 1 3.75 15.75V13.5a.75.75 0 0 1 .75-.75Z" />
              <path d="M4.5 12.75V9.75a2.25 2.25 0 0 1 2.25-2.25H9" />
              <path d="M5.25 12.75v-1.5a1.25 1.25 0 0 1 2.5 0v1.5" />
            </svg>
            {property.bathrooms} bath
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            {property.sqft.toLocaleString()} sqft
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[12px] text-slate-400">
            by {property.ownerName?.split(' ')[0] ?? 'Owner'}
          </span>
          {property.rating !== undefined && property.rating > 0 && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-amber-500">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z" clipRule="evenodd" />
              </svg>
              {property.rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
