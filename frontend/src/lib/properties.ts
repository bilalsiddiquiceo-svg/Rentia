import { apiFetch } from './api';
import type { Property, PropertyListResponse, PropertyAvailability } from '@/types/property';
export interface PropertyFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  q?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  light?: boolean;
}

export interface PropertyCardItem {
  id: string;
  title: string;
  photos: string[];
  status: 'active' | 'inactive';
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  city: string;
  neighborhood: string | null;
  ownerName: string;
}

const inflightMap = new Map<string, Promise<PropertyListResponse<any>>>();

export const fetchProperties = <T = Property>(
  filters: PropertyFilters = {},
): Promise<PropertyListResponse<T>> => {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.bedrooms !== undefined) params.set('bedrooms', String(filters.bedrooms));
  if (filters.q) params.set('q', filters.q);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.light) params.set('light', 'true');
  const qs = params.toString();
  const url = `/properties${qs ? `?${qs}` : ''}`;

  if (inflightMap.has(url)) {
    return inflightMap.get(url) as Promise<PropertyListResponse<T>>;
  }

  const promise = apiFetch<PropertyListResponse<T>>(url).finally(() => {
    inflightMap.delete(url);
  });
  inflightMap.set(url, promise);
  return promise;
};

export async function fetchProperty(id: string) {
  return apiFetch<Property>(`/properties/${id}`);
}

export async function fetchAvailability(id: string) {
  return apiFetch<PropertyAvailability>(`/properties/${id}/availability`);
}

export const fetchCities = (() => {
  let inflight: Promise<string[]> | null = null;
  return (): Promise<string[]> => {
    if (!inflight) {
      inflight = apiFetch<string[]>('/properties/cities').finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
})();

export function trackView(id: string) {
  apiFetch(`/properties/${id}/view`, { method: 'POST' }).catch(() => {});
}

export function trackClick(id: string) {
  apiFetch(`/properties/${id}/click`, { method: 'POST' }).catch(() => {});
}

export async function fetchOwnerProperties() {
  return apiFetch<Property[]>('/owner/properties');
}

export interface OwnerPropertyCard {
  id: string;
  title: string;
  photos: string[];
  status: 'active' | 'inactive';
  address: string;
  city: string;
  monthlyRent: number;
}

export async function fetchOwnerPropertyCards(): Promise<OwnerPropertyCard[]> {
  return apiFetch<OwnerPropertyCard[]>('/owner/properties/cards');
}

export interface OwnerStats {
  properties: {
    total: number;
    active: number;
    inactive: number;
    views: number;
    clicks: number;
  };
  payments: {
    projectedMonthlyRevenue: number;
    pendingCount: number;
    pendingAmount: number;
    totalBookings: number;
  };
  recentLeases: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    months: number;
    monthlyRent: number;
    property: { id: string; title: string; photo: string | null };
    tenant: { id: string; name: string };
  }>;
}

export async function fetchOwnerStats() {
  return apiFetch<OwnerStats>('/owner/properties/stats');
}

export async function fetchOwnerProperty(id: string) {
  return apiFetch<Property>(`/owner/properties/${id}`);
}

export async function createProperty(data: {
  title: string; description: string; address: string; city: string;
  neighborhood: string | null; neighborhood_description?: string | null; monthly_rent: number; bedrooms: number;
  bathrooms: number; sqft: number | null; photos: string[];
  features?: string[];
  latitude: number | null; longitude: number | null;
}) {
  return apiFetch<Property>('/properties', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProperty(id: string, data: {
  title: string; description: string; address: string; city: string;
  neighborhood: string | null; neighborhood_description?: string | null; monthly_rent: number; bedrooms: number;
  bathrooms: number; sqft: number | null; photos: string[];
  features?: string[];
  latitude: number | null; longitude: number | null;
}) {
  return apiFetch<Property>(`/owner/properties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function togglePropertyStatus(id: string) {
  return apiFetch<Property>(`/owner/properties/${id}/status`, {
    method: 'PATCH',
  });
}

export async function deleteProperty(id: string) {
  return apiFetch(`/owner/properties/${id}`, { method: 'DELETE' });
}

export async function presignPhotoUpload(fileName: string, contentType: string) {
  return apiFetch<{ uploadUrl: string; path: string; publicUrl: string }>(
    '/properties/uploads/presign',
    {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    },
  );
}

export async function uploadPhotoFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Photo upload failed');
}

export async function addFavorite(propertyId: string) {
  return apiFetch(`/favorites/${propertyId}`, { method: 'POST' });
}

export async function removeFavorite(propertyId: string) {
  return apiFetch(`/favorites/${propertyId}`, { method: 'DELETE' });
}

let favoritesInflight: Promise<PropertyCardItem[]> | null = null;

export const fetchFavorites = (): Promise<PropertyCardItem[]> => {
  if (!favoritesInflight) {
    favoritesInflight = apiFetch<PropertyCardItem[]>('/favorites').finally(() => {
      favoritesInflight = null;
    });
  }
  return favoritesInflight;
};

let favoriteIdsInflight: Promise<string[]> | null = null;

export const fetchFavoriteIds = (): Promise<string[]> => {
  if (!favoriteIdsInflight) {
    favoriteIdsInflight = apiFetch<string[]>('/favorites/ids').finally(() => {
      favoriteIdsInflight = null;
    });
  }
  return favoriteIdsInflight;
};
