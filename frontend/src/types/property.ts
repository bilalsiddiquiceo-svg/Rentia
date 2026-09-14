export type PropertyStatus = 'active' | 'inactive';

export interface PropertyOwner {
  id: string;
  name: string | null;
}

export interface AvailabilityRange {
  start: string;
  end: string;
}

export interface PropertyAvailability {
  booked: AvailabilityRange[];
  open: AvailabilityRange[];
}

export interface Property {
  id: string;
  title: string;
  description: string;
  neighborhoodDescription: string | null;
  address: string;
  city: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  photos: string[];
  features: string[];
  status: PropertyStatus;
  bookable: boolean;
  viewCount: number;
  clickCount: number;
  createdAt: string;
  availability: PropertyAvailability;
  owner: PropertyOwner;
}

export interface PropertyListResponse<T = Property> {
  items: T[];
  total: number;
}

export interface AvailabilitySegment {
  type: 'booked' | 'open';
  flex: number;
}

export function availabilityToSegments(
  availability: PropertyAvailability,
): AvailabilitySegment[] {
  const all = [...availability.booked.map((r) => ({ ...r, type: 'booked' as const })),
               ...availability.open.map((r) => ({ ...r, type: 'open' as const }))];
  all.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (all.length === 0) {
    return [{ type: 'open', flex: 1 }];
  }

  const totalMs =
    new Date(all[all.length - 1].end).getTime() -
    new Date(all[0].start).getTime();
  if (totalMs <= 0) return [{ type: 'open', flex: 1 }];

  return all.map((r) => ({
    type: r.type,
    flex: Math.max(
      0.05,
      (new Date(r.end).getTime() - new Date(r.start).getTime()) / totalMs,
    ),
  }));
}
