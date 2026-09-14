'use client';

import { useEffect, useRef } from 'react';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  height?: string;
  popup?: string;
}

export function LeafletMap({ latitude, longitude, height = '300px', popup = 'Property location' }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

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
        center: [latitude, longitude],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.marker([latitude, longitude], { icon })
        .addTo(map)
        .bindPopup(`<strong>${popup}</strong>`)
        .openPopup();

      mapRef.current = map;

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
  }, [latitude, longitude, popup]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
      className="border border-border"
    />
  );
}
