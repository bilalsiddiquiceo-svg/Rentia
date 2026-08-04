'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

const PROPERTIES = [
  { id: '1', title: 'Sunlit Studio in Downtown', address: '142 W 57th St', city: 'New York', neighborhood: 'Midtown', rent: 2450, bedrooms: 0, bathrooms: 1, sqft: 520, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&q=80', owner: 'Sarah Chen', rating: 4.8 },
  { id: '2', title: 'Modern Loft with City Views', address: '890 Arts Way', city: 'Los Angeles', neighborhood: 'Arts District', rent: 3200, bedrooms: 2, bathrooms: 2, sqft: 1100, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80', owner: 'Marcus Rivera', rating: 4.6 },
  { id: '3', title: 'Cozy Garden Apartment', address: '320 Oak Lane', city: 'Austin', neighborhood: 'Westside', rent: 1850, bedrooms: 1, bathrooms: 1, sqft: 750, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop&q=80', owner: 'Emily Watson', rating: 4.9 },
  { id: '4', title: 'Sleek One-Bed Near the Park', address: '401 E 72nd St', city: 'New York', neighborhood: 'Upper East Side', rent: 2800, bedrooms: 1, bathrooms: 1, sqft: 680, image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600&h=400&fit=crop&q=80', owner: 'James Park', rating: 4.5 },
  { id: '5', title: 'Spacious Family Home', address: '115 Maple Drive', city: 'Chicago', neighborhood: 'Lincoln Park', rent: 3500, bedrooms: 3, bathrooms: 2, sqft: 1650, image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=400&fit=crop&q=80', owner: 'David Kim', rating: 4.7 },
  { id: '6', title: 'Urban Micro-Unit with Rooftop', address: '77 Tech Blvd', city: 'San Francisco', neighborhood: 'SoMa', rent: 2100, bedrooms: 0, bathrooms: 1, sqft: 380, image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=400&fit=crop&q=80', owner: 'Lisa Nguyen', rating: 4.4 },
  { id: '7', title: 'Renovated Brownstone Flat', address: '28 Beacon Hill Rd', city: 'Boston', neighborhood: 'Back Bay', rent: 2950, bedrooms: 2, bathrooms: 1, sqft: 950, image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=400&fit=crop&q=80', owner: 'Robert Hale', rating: 4.9 },
  { id: '8', title: 'Waterfront Condo with Views', address: '500 Harbor St', city: 'Miami', neighborhood: 'Brickell', rent: 3800, bedrooms: 2, bathrooms: 2, sqft: 1200, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop&q=80', owner: 'Ana Torres', rating: 4.7 },
  { id: '9', title: 'Charming Cottage near Lake', address: '8 Lakeview Terrace', city: 'Austin', neighborhood: 'Tarrytown', rent: 2200, bedrooms: 2, bathrooms: 1, sqft: 900, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&q=80', owner: 'Tom Bradley', rating: 5.0 },
];

const CITIES = [...new Set(PROPERTIES.map((p) => p.city))].sort();
const BEDS = ['Any', 'Studio', '1+', '2+', '3+'];

export default function AppBrowsePage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [beds, setBeds] = useState('Any');
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'rating'>('rating');
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const bedCount = beds === 'Studio' ? 0 : beds === 'Any' ? -1 : parseInt(beds);
    return PROPERTIES.filter((p) => {
      if (city !== 'Any' && p.city !== city) return false;
      if (p.rent > maxPrice) return false;
      if (bedCount >= 0 && p.bedrooms < bedCount) return false;
      if (q && !`${p.title} ${p.address} ${p.neighborhood} ${p.city}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => sort === 'price-asc' ? a.rent - b.rent : sort === 'price-desc' ? b.rent - a.rent : b.rating - a.rating);
  }, [search, city, maxPrice, beds, sort]);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Browse properties</h1>
        <p className="mt-1 text-sm text-slate-500">{filtered.length} homes available across {CITIES.length} cities</p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, address, neighborhood…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:bg-white focus:ring-1 focus:ring-[#0F766E]/20"
          />
        </div>

        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0F766E]">
          <option>Any city</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select value={beds} onChange={(e) => setBeds(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0F766E]">
          {BEDS.map((b) => <option key={b}>{b}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-slate-500">${maxPrice.toLocaleString()}</span>
          <input type="range" min={1500} max={5000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-24 accent-[#0F766E]" />
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0F766E]">
          <option value="rating">Top rated</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <p className="text-sm font-medium text-slate-600">No properties match your filters</p>
          <button onClick={() => { setSearch(''); setCity('Any'); setMaxPrice(5000); setBeds('Any'); }} className="mt-3 text-sm font-semibold text-[#0F766E] hover:underline">Reset filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/property/${p.id}`} className="group block">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    onLoad={() => setImgLoaded((prev) => ({ ...prev, [p.id]: true }))}
                    className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded[p.id] ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!imgLoaded[p.id] && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-white/90 px-2.5 py-1 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-sm">
                      ${p.rent.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span>
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#0F766E]">{p.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    {p.neighborhood}, {p.city}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bd`}</span>
                      <span>{p.bathrooms} ba</span>
                      <span>{p.sqft.toLocaleString()} ft²</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                      </svg>
                      {p.rating}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
