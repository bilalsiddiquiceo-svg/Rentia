'use client';

import { useState } from 'react';
import Link from 'next/link';

const FAVORITES = [
  { id: '1', title: 'Sunlit Studio in Downtown', address: '142 W 57th St', city: 'New York', rent: 2450, bedrooms: 0, bathrooms: 1, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&q=80', rating: 4.8 },
  { id: '6', title: 'Urban Micro-Unit with Rooftop', address: '77 Tech Blvd', city: 'San Francisco', rent: 2100, bedrooms: 0, bathrooms: 1, image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=400&fit=crop&q=80', rating: 4.4 },
  { id: '9', title: 'Charming Cottage near Lake', address: '8 Lakeview Terrace', city: 'Austin', rent: 2200, bedrooms: 2, bathrooms: 1, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&q=80', rating: 5.0 },
];

export default function FavoritesPage() {
  const [items, setItems] = useState(FAVORITES);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Saved homes</h1>
        <p className="mt-1 text-sm text-slate-500">{items.length} properties you&apos;ve favorited</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <p className="text-sm font-medium text-slate-600">No favorites yet</p>
          <Link href="/app" className="mt-3 inline-block text-sm font-semibold text-[#0F766E] hover:underline">Browse properties</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80">
              <Link href={`/property/${p.id}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105" />
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-white/90 px-2.5 py-1 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-sm">
                      ${p.rent.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span>
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#0F766E]">{p.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{p.city}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">{p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bd`} · {p.bathrooms} ba</span>
                    <span className="text-xs font-medium text-amber-500">★ {p.rating}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
