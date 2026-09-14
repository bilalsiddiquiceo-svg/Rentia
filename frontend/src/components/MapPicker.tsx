'use client';

import { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

export function MapPicker({
  initialLat = 40.7128,
  initialLng = -74.006,
  onLocationChange,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let destroyed = false;

    (async () => {
      const L = (await import('leaflet')).default;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#B4652B;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      const container = containerRef.current;
      if (!container || destroyed) return;

      // Prevent "Map container is already initialized" on React 19 double-fire
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (container as any)._leaflet_id;

      const map = L.map(container, {
        center: [initialLat ?? 40.7128, initialLng ?? -74.006],
        zoom: 13,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([initialLat ?? 40.7128, initialLng ?? -74.006], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', async () => {
        if (destroyed) return;
        const pos = marker.getLatLng();
        const addr = await reverseGeocode(pos.lat, pos.lng);
        onLocationChange(pos.lat, pos.lng, addr);
      });

      marker.bindPopup('Drag to set exact location').openPopup();

      mapRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        if (!destroyed && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !markerRef.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept': 'application/json' } },
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon, display_name } = results[0];
        markerRef.current.setLatLng([lat, lon]);
        mapRef.current.setView([lat, lon], 15);
        onLocationChange(parseFloat(lat), parseFloat(lon), display_name);
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search address or area…"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div
        ref={containerRef}
        style={{ height: '320px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
        className="border border-slate-200"
      />
      <p className="text-[11px] text-slate-400">
        Use the search box or drag the pin to set the exact location.
      </p>
    </div>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept': 'application/json' } },
    );
    const data = await res.json();
    return data.display_name as string | undefined;
  } catch {
    return undefined;
  }
}
