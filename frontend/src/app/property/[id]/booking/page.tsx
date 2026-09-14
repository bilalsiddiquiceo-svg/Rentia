'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { fetchProperty } from '@/lib/properties';
import { createLease, createCheckoutSession } from '@/lib/leases';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import type { Property, PropertyAvailability } from '@/types/property';

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [availability, setAvailability] = useState<PropertyAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchProperty(params.id)
      .then((p) => {
        setProperty(p);
        setAvailability(p.availability ?? null);
      })
      .catch((err) => setError(err?.message || 'Could not load property'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const endDate = start ? new Date(start.getTime() + months * 30 * 24 * 60 * 60 * 1000) : null;

  const overlapsBooked = (() => {
    if (!start || !endDate || !availability) return false;
    for (const range of availability.booked) {
      const rs = new Date(`${range.start}T00:00:00`);
      const re = new Date(`${range.end}T00:00:00`);
      if (rs < endDate && re > start) return true;
    }
    return false;
  })();

  const maxSelectable = (() => {
    if (!availability) return null;
    const ends = [
      ...availability.booked.map((r) => r.end),
      ...availability.open.map((r) => r.end),
    ].sort();
    return ends.length > 0 ? ends[ends.length - 1] : null;
  })();

  const handleSubmit = async () => {
    if (!property || !startDate) return;
    setError(null);
    setSubmitting(true);
    try {
      const lease = await createLease({
        property_id: property.id,
        start_date: startDate,
        months,
      });
      const { url } = await createCheckoutSession(lease.id);
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setError(msg);
      toast(msg, 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-10">
        <Skeleton className="h-4 w-56" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
            <Skeleton className="mt-6 h-64 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm text-slate-500">Property not found.</p>
        <Link href="/app" className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
          Back to Browse
        </Link>
      </div>
    );
  }

  const canSubmit = !!startDate && start !== null && start > today && !overlapsBooked && !submitting;

  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl py-10">
        <Link href={`/property/${property.id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to {property.title}
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="font-[Cinzel] text-3xl font-bold text-slate-900">Book your stay</h1>
            <p className="mt-1 text-sm text-slate-500">
              Bookings run in fixed 30-day blocks from your chosen start date.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Move-in date
              </label>
              <div className="mt-3">
                {availability ? (
                  <AvailabilityCalendar
                    availability={availability}
                    selected={startDate}
                    onSelect={setStartDate}
                    maxSelectable={maxSelectable}
                    rangeDays={months * 30}
                  />
                ) : (
                  <p className="text-[12px] text-slate-500">Loading availability…</p>
                )}
              </div>
              {start && endDate && (
                <p className="mt-3 text-[12px] text-slate-500">
                  {formatDate(start)} → {formatDate(endDate)} ({months} month{months > 1 ? 's' : ''} = {months * 30} days)
                </p>
              )}
              <p className="mt-2 text-[12px] text-slate-500">
                Booked and past dates are disabled — select an available move-in date.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Number of months
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`h-11 w-12 rounded-xl border text-sm font-semibold transition-colors ${
                      months === m
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                {property.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={property.photos[0]} alt={property.title} className="h-20 w-24 rounded-xl object-cover" />
                ) : (
                  <div className="h-20 w-24 rounded-xl bg-slate-100" />
                )}
                <div>
                  <h2 className="font-semibold text-slate-900">{property.title}</h2>
                  <p className="text-[12px] text-slate-500">
                    {property.city}
                    {property.neighborhood ? ` · ${property.neighborhood}` : ''}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                    {formatMoney(property.monthlyRent)}
                    <span className="text-[12px] font-normal text-slate-400">/mo</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-[13px]">
                <div className="flex justify-between text-slate-500">
                  <span>First month × {formatMoney(property.monthlyRent)}</span>
                  <span className="font-mono tabular-nums text-slate-700">{formatMoney(property.monthlyRent)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Remaining month{months > 1 ? `s (${months - 1})` : ''} billed monthly</span>
                  <span className="text-slate-400">via Stripe</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Service & platform fee</span>
                  <span className="text-slate-700">$0</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 font-semibold text-slate-900">
                  <span>Total due today</span>
                  <span className="font-mono tabular-nums">{formatMoney(property.monthlyRent)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                  {error}
                </div>
              )}

              {overlapsBooked && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-700">
                  These dates overlap an existing booking. Pick different dates.
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-xl bg-brand py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Creating booking…' : `Confirm & Pay ${formatMoney(property.monthlyRent)}`}
              </button>
              <p className="mt-3 text-center text-[12px] text-slate-400">
                You&apos;ll be redirected to Stripe to complete payment securely.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-[12px] leading-relaxed text-slate-500 shadow-sm">
              <p className="font-semibold text-slate-700">Cancellation policy</p>
              <p className="mt-1">
                You can cancel anytime before your move-in date and receive a full refund. After move-in, you can cancel with a prorated refund for unused time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
