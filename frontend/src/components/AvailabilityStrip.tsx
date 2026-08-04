import type { AvailabilitySegment } from '@/data/mock-properties';

interface AvailabilityStripProps {
  segments: AvailabilitySegment[];
  className?: string;
}

export function AvailabilityStrip({ segments, className = '' }: AvailabilityStripProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-light">
        <span>Today</span>
        <span>3 mo</span>
        <span>6 mo</span>
        <span>9 mo</span>
      </div>
      <div className="availability-strip">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={seg.type === 'booked' ? 'availability-booked' : 'availability-open'}
            style={{ flex: seg.flex }}
            title={seg.type === 'booked' ? 'Booked' : 'Available'}
          ></div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-clay"></span>
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-moss"></span>
          Available
        </span>
      </div>
    </div>
  );
}
