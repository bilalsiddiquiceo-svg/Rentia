'use client';

import { useState, useMemo } from 'react';
import type { PropertyAvailability } from '@/types/property';

interface AvailabilityCalendarProps {
  availability: PropertyAvailability;
  visibleMonths?: number;
  /** ISO date string (YYYY-MM-DD) of the currently selected day. */
  selected?: string | null;
  /** When provided, available days become clickable and selectable. */
  onSelect?: (isoDate: string) => void;
  /** ISO date cap: days past this are treated as unavailable (no data coverage). */
  maxSelectable?: string | null;
  /** Days after the selected move-in date to highlight as the stay period. */
  rangeDays?: number;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isDateBooked(
  year: number,
  month: number,
  day: number,
  booked: PropertyAvailability['booked'],
): boolean {
  const t = new Date(year, month, day).getTime();
  return booked.some((r) => {
    const s = new Date(r.start).getTime();
    const e = new Date(r.end).getTime();
    return t >= s && t < e;
  });
}

function isPast(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function isToday(year: number, month: number, day: number): boolean {
  const d = new Date();
  return (
    year === d.getFullYear() &&
    month === d.getMonth() &&
    day === d.getDate()
  );
}

function toISODate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function AvailabilityCalendar({
  availability,
  visibleMonths = 3,
  selected = null,
  onSelect,
  maxSelectable = null,
  rangeDays = 0,
}: AvailabilityCalendarProps) {
  const interactive = typeof onSelect === 'function';
  const now = new Date();
  const [offset, setOffset] = useState(0);

  const selectedStart = selected ? new Date(`${selected}T00:00:00`).getTime() : null;
  const rangeEnd =
    selectedStart != null && rangeDays > 0
      ? selectedStart + rangeDays * 24 * 60 * 60 * 1000
      : null;

  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + offset;

  const months = useMemo(() => {
    const result: { year: number; month: number; days: (number | null)[] }[] = [];
    for (let i = 0; i < visibleMonths; i++) {
      const m = (startMonth + i) % 12;
      const y = startMonth + i >= 12 ? startYear + Math.floor((startMonth + i) / 12) : startYear;
      const total = daysInMonth(y, m);
      const firstDay = new Date(y, m, 1).getDay();
      const days: (number | null)[] = [
        ...Array.from({ length: firstDay }, () => null),
        ...Array.from({ length: total }, (_, i) => i + 1),
      ];
      result.push({ year: y, month: m, days });
    }
    return result;
  }, [startYear, startMonth, visibleMonths]);

  const bookedCount = useMemo(() => {
    let count = 0;
    for (const m of months) {
      for (let d = 1; d <= daysInMonth(m.year, m.month); d++) {
        if (isDateBooked(m.year, m.month, d, availability.booked)) count++;
      }
    }
    return count;
  }, [months, availability.booked]);

  const totalDays = useMemo(() => {
    return months.reduce((sum, m) => sum + daysInMonth(m.year, m.month), 0);
  }, [months]);

  const canPrev = offset > 0;
  const canNext = offset < 24;

  const legend = interactive ? (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full border border-border bg-white" />
      Selectable
    </span>
  ) : (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full border border-border bg-white" />
      Available
    </span>
  );

  return (
    <div>
      {/* Legend */}
      <div className="mb-5 flex items-center gap-5 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-clay" />
          Booked
        </span>
        {interactive && rangeDays > 0 && selected && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand/15 ring-1 ring-brand/50" />
            Selected stay
          </span>
        )}
        {interactive && rangeDays === 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            Selected
          </span>
        )}
        {legend}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          Past
        </span>
        <span className="ml-auto text-[11px] text-muted-light">
          {bookedCount} of {totalDays} days booked
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={!canPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-clay hover:text-clay disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-[13px] font-medium text-ink">
          {MONTH_NAMES[months[0].month]} {months[0].year}
          {months.length > 1 && ` — ${MONTH_NAMES[months[months.length - 1].month]} ${months[months.length - 1].year}`}
        </span>
        <button
          onClick={() => setOffset((o) => Math.min(24, o + 1))}
          disabled={!canNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-clay hover:text-clay disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className={`mt-4 grid gap-4 sm:grid-cols-${visibleMonths <= 3 ? visibleMonths : 3}`}>
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="rounded-xl border border-border bg-white p-3">
            <h4 className="mb-2.5 text-center text-[13px] font-semibold text-ink">
              {MONTH_NAMES[m.month]} {m.year}
            </h4>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="pb-1 text-center text-[9px] font-medium uppercase tracking-wider text-muted-light">
                  {d}
                </div>
              ))}
              {m.days.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;

                const past = isPast(m.year, m.month, day);
                const booked = isDateBooked(m.year, m.month, day, availability.booked);
                const today = isToday(m.year, m.month, day);
                const iso = toISODate(m.year, m.month, day);
                const isSelected = selected === iso;
                const inRange =
                  selectedStart != null &&
                  rangeEnd != null &&
                  new Date(m.year, m.month, day).getTime() >= selectedStart &&
                  new Date(m.year, m.month, day).getTime() < rangeEnd;
                const beyondMax = Boolean(maxSelectable) && iso > maxSelectable!;
                const selectable = interactive && !past && !booked && !today && !beyondMax;

                if (selectable) {
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onSelect!(iso)}
                      title={isSelected ? 'Selected move-in date' : 'Available'}
                      className={`flex h-7 w-full items-center justify-center rounded-md text-[11px] transition-colors ${
                        isSelected
                          ? 'bg-brand font-semibold text-white hover:bg-brand-deep'
                          : inRange
                            ? 'bg-brand/15 font-medium text-brand hover:bg-brand-deep/10'
                            : 'border border-border bg-white text-muted hover:border-clay hover:bg-clay/10 hover:text-clay'
                      }`}
                    >
                      {day}
                    </button>
                  );
                }

                return (
                  <div
                    key={day}
                    title={booked ? 'Booked' : past ? 'Past' : 'Unavailable'}
                    className={`flex h-7 w-full items-center justify-center rounded-md text-[11px] ${
                      booked
                        ? 'bg-clay/12 font-medium text-clay'
                        : past
                          ? 'text-slate-300'
                          : inRange
                            ? 'bg-brand/15 font-medium text-brand'
                            : today
                              ? 'ring-1 ring-clay/40 font-medium text-ink'
                              : 'text-muted'
                    } ${interactive ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}