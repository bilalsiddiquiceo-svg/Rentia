'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasStarted(true); obs.disconnect(); } },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

const FEATURED_PROPERTIES: {
  id: number;
  title: string;
  location: string;
  rent: number;
  image: string;
}[] = [
  {
    id: 1,
    title: 'Sunlit Studio in Downtown',
    location: 'Midtown · 1 Bed',
    rent: 1850,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 2,
    title: 'Modern Loft with City Views',
    location: 'Arts District · 2 Bed',
    rent: 2400,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 3,
    title: 'Cozy Garden Apartment',
    location: 'Westside · 1 Bed',
    rent: 1600,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 4,
    title: 'Skyline Penthouse',
    location: 'Downtown · 3 Bed',
    rent: 3200,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 5,
    title: 'Minimalist Loft Studio',
    location: 'SoDo · 1 Bed',
    rent: 1400,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 6,
    title: 'Garden-View Retreat',
    location: 'Fremont · 2 Bed',
    rent: 2100,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60',
  },
];

const STATS = [
  {
    end: 2400,
    suffix: '+',
    label: 'Properties Listed',
    description: 'Verified homes across top neighborhoods',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop&q=80',
  },
  {
    end: 30,
    suffix: '',
    label: 'Day Booking Blocks',
    description: 'Fixed monthly terms, no surprise renewals',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80',
  },
  {
    end: 3,
    suffix: '',
    label: 'Day Payout Hold',
    description: 'Transparent hold before owner payout',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop&q=80',
  },
  {
    end: 0,
    suffix: '%',
    label: 'Hidden Fees',
    description: 'What you see is what you pay',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop&q=80',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Browse & compare',
    description:
      'Search properties by location, price, and availability. Every listing shows live open blocks so you can plan your move with zero guesswork.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Book a 30-day block',
    description:
      'Pick your start date and secure the block. Fixed 30-day terms, no hidden fees, and a secure Stripe checkout in under two minutes.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Move in & pay monthly',
    description:
      'Rent auto-renews every 30 days and goes directly to the owner after a short, transparent 3-day hold.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 16.5a2.25 2.25 0 0 1-2.25 2.25h-.75v.75a2.25 2.25 0 0 1-2.25 2.25H4.5a.75.75 0 0 1-.75-.75v-2.73c0-.596.237-1.168.659-1.589l4.66-4.66c.403-.404.526-1 .43-1.563A6 6 0 0 1 15.75 5.25Z" />
      </svg>
    ),
  },
];

const WHY_FEATURES = [
  {
    title: 'Fixed 30-day blocks',
    description: 'No partial months, no complicated leases — book exactly one month at a time.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80',
    stat: '30',
    statLabel: 'days per block',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Recurring payments',
    description: 'Rent auto-collects every 30 days, so neither side ever has to chase a payment.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop&q=80',
    stat: '100%',
    statLabel: 'auto-collected',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    title: '3-day payout hold',
    description: 'A short, clearly-stated hold protects both sides before owners get paid.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=400&fit=crop&q=80',
    stat: '3',
    statLabel: 'days to clear',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: 'Real-time availability',
    description: 'Open blocks shown live on every listing — no back-and-forth, no guesswork.',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop&q=80',
    stat: 'Live',
    statLabel: 'on every listing',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Found a verified place in two days. The availability timeline meant zero back-and-forth with owners.',
    name: 'Maya Reyes',
    role: 'Renter · Arts District',
    initials: 'MR',
  },
  {
    quote:
      'Payouts land on schedule, every time. The 3-day hold is clearly explained — no surprises.',
    name: 'Daniel Okafor',
    role: 'Owner · Westside',
    initials: 'DO',
  },
  {
    quote:
      'The first rental platform where the price shown is exactly what I paid. No fees at the end.',
    name: 'Priya Sharma',
    role: 'Renter · Downtown',
    initials: 'PS',
  },
  {
    quote:
      'Listed my unit on a Sunday, had a verified renter by Tuesday. The dashboard does the heavy lifting.',
    name: 'Liam Chen',
    role: 'Owner · Midtown',
    initials: 'LC',
  },
  {
    quote:
      'Auto-renewals mean I never think about rent. It just works, month after month.',
    name: 'Sofia Marino',
    role: 'Renter · Fremont',
    initials: 'SM',
  },
];

const HERO_TRUST_ITEMS = ['No hidden fees', '30-day blocks', 'Direct payouts'];

const ICONS = {
  check: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  checkSm: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  arrow: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
  pin: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  calendar: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  calendarSm: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  shield: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  building: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  lock: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  quote: (
    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.17 6C4.42 6 2.5 8.14 2.5 11.01c0 2.87 1.92 4.9 4.3 4.9.35 0 .68-.04 1-.13-.62 1.42-1.98 2.5-3.67 2.87A.5.5 0 0 0 4.3 20.5c4.04-.75 6.7-3.87 6.7-8.45V10.1C11 7.5 9.38 6 7.17 6Zm9.66 0c-2.75 0-4.67 2.14-4.67 5.01 0 2.87 1.92 4.9 4.3 4.9.35 0 .68-.04 1-.13-.62 1.42-1.98 2.5-3.67 2.87a.5.5 0 0 0 .17.85c4.04-.75 6.7-3.87 6.7-8.45V10.1C20.67 7.5 19.04 6 16.83 6Z" />
    </svg>
  ),
};

function StatCardBento({
  end, suffix, label, description, image, icon, className = '',
}: {
  end: number; suffix: string; label: string; description: string;
  image: string; icon: React.ReactNode; className?: string;
}) {
  const { count, ref } = useCountUp(end, 2200);
  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-3xl border border-mist bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-coal/8 ${className}`}
    >
      <div className="relative h-full min-h-[260px] overflow-hidden">
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/50 to-coal/10"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-mint backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <span className="font-mono text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">
                {end === 0 ? '0' : count.toLocaleString()}
                <span className="text-mint">{suffix}</span>
              </span>
            </div>
          </div>
          <h3 className="mt-3 text-base font-bold text-white">{label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/60">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: (typeof STATS)[number] }) {
  const { count, ref } = useCountUp(stat.end, 2200);
  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-coal/5"
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={stat.image}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean via-ocean/70 to-transparent"></div>
        <div className="absolute bottom-4 left-5">
          <span className="font-mono text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            {stat.end === 0 ? '0' : count.toLocaleString()}
            <span className="text-mint">{stat.suffix}</span>
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-sm font-bold text-coal">{stat.label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{stat.description}</p>
      </div>
    </div>
  );
}

function PropertyCard({
  property,
}: {
  property: (typeof FEATURED_PROPERTIES)[number];
}) {
  const { user } = useAuth();
  const href = user ? '/app' : '/signup';
  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-coal/5">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-400/20 via-sky-400/10 to-slate-900/10">
          <Image
            src={property.image}
            alt={property.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10"></div>
          <div className="absolute bottom-3 left-4">
            <span className="font-mono text-lg font-bold text-white/60 blur-[4px] drop-shadow">
              ${property.rent.toLocaleString()}<span className="text-xs font-medium text-white/40">/mo</span>
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="select-none blur-[3px]" aria-hidden="true">
            <h3 className="text-[15px] font-bold leading-snug text-coal">{property.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <svg className="h-3.5 w-3.5 text-brand/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {property.location}
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
            {ICONS.checkSm}
            {user ? 'Browse similar homes' : 'Sign up to browse'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/app');
    }
  }, [isLoading, user, router]);

  return (
    <div className="lp-shell -mt-8">
      {/* ─── Hero — Modern Image-based ──────────────────────── */}
      <section id="top" className="relative scroll-mt-28 overflow-hidden bg-ocean">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&h=900&fit=crop&q=80"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ocean via-ocean/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-ocean/80 via-transparent to-ocean/20"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div className="lp-animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-mint backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60 motion-reduce:animate-none"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-mint"></span>
                </span>
                Trust-driven direct rentals
              </div>

              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Rent a home,<br />
                not a <span className="lp-text-gradient">headache.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
                Fixed 30-day blocks. Transparent pricing. Secure owner payouts.
                No hidden fees, no surprise charges — ever.
              </p>

              {/* Trust row */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/50">
                {HERO_TRUST_ITEMS.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    {ICONS.check}
                    {item}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {user ? (
                  user.role === 'owner' ? (
                    <Link
                      href="/dashboard"
                      className="btn-motion inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-ocean shadow-lg"
                    >
                      Owner Dashboard
                      <span className="arrow-icon">{ICONS.arrow}</span>
                    </Link>
                  ) : (
                    <Link
                      href="/app"
                      className="btn-motion inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-ocean shadow-lg"
                    >
                      Browse Properties
                      <span className="arrow-icon">{ICONS.arrow}</span>
                    </Link>
                  )
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="btn-motion inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-ocean shadow-lg"
                    >
                      Get Started Free
                      <span className="arrow-icon">{ICONS.arrow}</span>
                    </Link>
                    <Link
                      href="/login"
                      className="btn-motion inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Image mosaic */}
            <div className="relative hidden lg:grid lg:grid-cols-2 lg:gap-4" aria-hidden="true">
              <div className="space-y-4">
                <div className="lp-animate-slide-up overflow-hidden rounded-2xl shadow-2xl" style={{ animationDelay: '0.2s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400&h=500&fit=crop&q=80"
                    alt=""
                    className="h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="lp-animate-slide-up overflow-hidden rounded-2xl shadow-2xl" style={{ animationDelay: '0.4s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&q=80"
                    alt=""
                    className="h-44 w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="lp-animate-slide-up overflow-hidden rounded-2xl shadow-2xl" style={{ animationDelay: '0.3s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop&q=80"
                    alt=""
                    className="h-44 w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="lp-animate-slide-up overflow-hidden rounded-2xl shadow-2xl" style={{ animationDelay: '0.5s' }}>
                  <img
                    src="https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&h=500&fit=crop&q=80"
                    alt=""
                    className="h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Floating stat badge */}
              <div className="absolute -left-6 top-1/2 z-10 -translate-y-1/2">
                <div className="lp-float flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/20 text-mint">
                    {ICONS.shield}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Stripe-verified</div>
                    <div className="text-[11px] text-white/50">Secure payouts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats — Bento Grid ─────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-4 py-1.5 text-xs font-semibold text-brand">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              By the numbers
            </div>
            <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-coal sm:text-5xl">
              A platform built on <span className="text-brand">trust.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
              Every number here represents a commitment — to transparent pricing, predictable terms, and zero surprises.
            </p>
          </div>

          {/* Bento grid: asymmetric Apple-style layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12 lg:gap-5">
            {/* Large hero stat: Properties Listed */}
            <StatCardBento
              end={2400}
              suffix="+"
              label="Properties Listed"
              description="Verified homes across top neighborhoods — and growing every week."
              image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop&q=80"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              }
              className="sm:col-span-2 lg:col-span-7 lg:row-span-2"
            />
            {/* Medium stat: 30-day blocks */}
            <StatCardBento
              end={30}
              suffix=""
              label="Day Booking Blocks"
              description="Fixed monthly terms. No surprise renewals."
              image="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              }
              className="lg:col-span-5"
            />
            {/* Medium stat: 3-day payout */}
            <StatCardBento
              end={3}
              suffix=""
              label="Day Payout Hold"
              description="Transparent hold. Owners get paid on schedule."
              image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop&q=80"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
              className="lg:col-span-5"
            />
            {/* Wide stat: 0% fees */}
            <StatCardBento
              end={0}
              suffix="%"
              label="Hidden Fees"
              description="What you see is what you pay. Always."
              image="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop&q=80"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
              className="sm:col-span-2 lg:col-span-12"
            />
          </div>
        </div>
      </section>

      {/* ─── Featured properties ─────────────────────────────── */}
      <section id="browse" className="scroll-mt-28 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">
            Available now
          </div>
          <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-coal sm:text-4xl">
            Find homes you can afford
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            A preview of what is on the platform. Full listings with real-time
            availability are rolling out soon.
          </p>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {FEATURED_PROPERTIES.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
      </section>

      {/* ─── How it works — Modern Timeline ──────────────────── */}
      <section id="how-it-works" className="scroll-mt-28 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-4 py-1.5 text-xs font-semibold text-brand">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Simple process
            </div>
            <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-coal sm:text-5xl">
              Move in, <span className="text-brand">stress-free.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
              No brokers, no paperwork, no surprises. Three steps from browsing to moving in.
            </p>
          </div>

          <div className="relative grid items-stretch gap-8 md:grid-cols-3 md:gap-10">
            {/* Connecting line */}
            <div className="pointer-events-none absolute inset-x-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent md:block" aria-hidden="true"></div>

            {STEPS.map((step) => (
              <div
                key={step.number}
                className="group relative"
              >
                {/* Step number circle */}
                <div className="relative z-10 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand/15 bg-white shadow-lg shadow-brand/5 transition-all duration-300 group-hover:border-brand/40 group-hover:shadow-xl group-hover:shadow-brand/10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-mint text-white shadow-md transition-transform duration-300 group-hover:scale-110">
                    {step.icon}
                  </div>
                </div>

                {/* Card content */}
                <div className="flex h-full flex-col rounded-3xl border border-mist bg-white p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-coal/5">
                  <div className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                    Step {step.number}
                  </div>
                  <h3 className="text-lg font-bold text-coal">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Rentia — Feature Showcase ───────────────────── */}
      <section id="why-rentia" className="scroll-mt-28 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-4 py-1.5 text-xs font-semibold text-brand">
              {ICONS.building}
              Why Rentia
            </div>
            <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-coal sm:text-5xl">
              Renting made simple,<br />
              <span className="text-brand">on purpose.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-500 sm:text-lg">
              Every lease, payment, and payout is visible to both parties — no
              middlemen, no hidden commissions, just a clear agreement.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-mist bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-brand/20 hover:shadow-2xl hover:shadow-coal/8"
              >
                {/* Image header */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={feature.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-coal/80 via-coal/30 to-transparent"></div>
                  {/* Stat badge floating on image */}
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="flex items-end gap-2">
                      <span className="font-mono text-4xl font-extrabold leading-none text-white drop-shadow-lg">
                        {feature.stat}
                      </span>
                      <span className="mb-1 text-sm font-medium text-white/70">{feature.statLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                      {feature.icon}
                    </div>
                    <h3 className="text-base font-bold text-coal">{feature.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            {['Stripe-verified payouts', 'No hidden commissions', '24/7 support', 'Transparent pricing'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                {ICONS.checkSm}
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials — Auto-scroll marquee ──────────────── */}
      <section id="stories" className="scroll-mt-28 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-4 py-1.5 text-xs font-semibold text-brand">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
              </svg>
              Loved by both sides
            </div>
            <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-coal sm:text-5xl">
              Trusted on every <span className="text-brand">lease.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
              Renters and owners agree: transparency changes everything.
            </p>
          </div>
        </div>

        {/* Marquee row 1 — scrolls left */}
        <div className="lp-marquee relative overflow-hidden">
          <div className="lp-marquee-track lp-marquee-left flex gap-5 px-5">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <figure
                key={`${t.name}-${i}`}
                className="w-[360px] shrink-0 rounded-3xl border border-mist bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-coal/5"
              >
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-slate-600">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-mist pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-mint text-xs font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-coal">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* Marquee row 2 — scrolls right */}
        <div className="lp-marquee relative mt-5 overflow-hidden">
          <div className="lp-marquee-track lp-marquee-right flex gap-5 px-5">
            {[...TESTIMONIALS, ...TESTIMONIALS].reverse().map((t, i) => (
              <figure
                key={`${t.name}-r2-${i}`}
                className="w-[360px] shrink-0 rounded-3xl border border-mist bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-coal/5"
              >
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-slate-600">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-mist pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ocean to-sky-400 text-xs font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-coal">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Owner CTA — Modern Split ────────────────────────── */}
      <section id="owners" className="scroll-mt-28 pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-ocean">
            <div className="grid items-center lg:grid-cols-2">
              {/* Copy side */}
              <div className="relative z-10 p-10 sm:p-14 lg:p-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-mint backdrop-blur">
                  {ICONS.building}
                  For Property Owners
                </div>
                <h2 className="mt-6 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Turn your property into passive income.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
                  List in minutes with zero commission. Rentia handles renter
                  screening, payments, and payouts — you get paid directly to your
                  bank, with full dashboard analytics included.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { n: '0%', label: 'Commission' },
                    { n: '<2min', label: 'To list' },
                    { n: '3-day', label: 'Payout cycle' },
                    { n: '24/7', label: 'Support' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="font-mono text-lg font-bold text-mint">{s.n}</div>
                      <div className="text-xs text-white/50">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {user && user.role === 'owner' ? (
                    <Link
                      href="/dashboard"
                      className="btn-motion inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-ocean shadow-xl"
                    >
                      Go to Dashboard
                      <span className="arrow-icon">{ICONS.arrow}</span>
                    </Link>
                  ) : (
                    <Link
                      href={user ? '/become-owner' : '/signup'}
                      className="btn-motion inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-ocean shadow-xl"
                    >
                      Become an Owner
                      <span className="arrow-icon">{ICONS.arrow}</span>
                    </Link>
                  )}
                  <Link
                    href="/app"
                    className="btn-motion inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-medium text-white"
                  >
                    Browse listings
                    <span className="arrow-icon">{ICONS.arrow}</span>
                  </Link>
                </div>
              </div>

              {/* Image side */}
              <div className="relative hidden h-full min-h-[400px] lg:block">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=80"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ocean via-ocean/40 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 flex gap-3">
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                    <div className="text-xl font-bold text-white">4.9</div>
                    <div className="text-[10px] text-white/50">Avg rating</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                    <div className="text-xl font-bold text-white">98%</div>
                    <div className="text-[10px] text-white/50">On-time pay</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                    <div className="text-xl font-bold text-white">$3.2k</div>
                    <div className="text-[10px] text-white/50">Avg. rent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
