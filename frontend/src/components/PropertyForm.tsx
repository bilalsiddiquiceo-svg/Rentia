'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { presignPhotoUpload, uploadPhotoFile } from '@/lib/properties';
import { LISTING_FEATURES, FEATURE_ICONS, FALLBACK_FEATURE_ICON } from '@/lib/features';

const MapPicker = dynamic(
  () => import('@/components/MapPicker').then((m) => m.MapPicker),
  { ssr: false },
);

interface PropertyFormData {
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  neighborhood_description: string;
  monthly_rent: number | '';
  bedrooms: number | '';
  bathrooms: number | '';
  sqft: number | '';
  photos: string[];
  features: string[];
  latitude: number | null;
  longitude: number | null;
}

interface PropertyFormProps {
  initialData?: Partial<PropertyFormData>;
  onSubmit: (data: {
    title: string; description: string; address: string; city: string;
    neighborhood: string | null; neighborhood_description: string | null; monthly_rent: number; bedrooms: number;
    bathrooms: number; sqft: number | null; photos: string[];
    features: string[];
    latitude: number | null; longitude: number | null;
  }) => Promise<void>;
  submitLabel: string;
}

const EMPTY: PropertyFormData = {
  title: '',
  description: '',
  address: '',
  city: '',
  neighborhood: '',
  neighborhood_description: '',
  monthly_rent: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  photos: [],
  features: [],
  latitude: null,
  longitude: null,
};

export function PropertyForm({ initialData, onSubmit, submitLabel }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyFormData>({ ...EMPTY, ...initialData });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = '';

    const remaining = 5 - form.photos.length;
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`Max 5 photos. Only ${remaining} more allowed.`);
    } else {
      setError('');
    }

    setUploading(true);
    setUploadProgress(toUpload.map((f) => f.name));

    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const { uploadUrl, publicUrl } = await presignPhotoUpload(file.name, file.type || 'image/jpeg');
        await uploadPhotoFile(uploadUrl, file);
        uploaded.push(publicUrl);
        setUploadProgress((prev) => prev.filter((n) => n !== file.name));
      }
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
      setUploadProgress([]);
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim() || !form.address.trim() || !form.city.trim()) {
      setError('Title, description, address, and city are required.');
      return;
    }
    if (!form.monthly_rent || Number(form.monthly_rent) <= 0) {
      setError('Monthly rent must be a positive number.');
      return;
    }
    if (form.bedrooms === '' || Number(form.bedrooms) < 0) {
      setError('Number of bedrooms is required.');
      return;
    }
    if (form.bathrooms === '' || Number(form.bathrooms) < 0) {
      setError('Number of bathrooms is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim() || null,
        neighborhood_description: form.neighborhood_description.trim() || null,
        monthly_rent: Number(form.monthly_rent),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        sqft: form.sqft ? Number(form.sqft) : null,
        photos: form.photos,
        features: form.features,
        latitude: form.latitude,
        longitude: form.longitude,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Basic details</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">Tell renters about your property.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Sunlit Studio in Downtown"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe what makes this place special…"
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10 resize-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="123 Main St"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="New York"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Neighborhood description <span className="text-slate-300">(optional)</span></label>
            <p className="mt-0.5 text-[11px] text-slate-400">Tell renters what&apos;s great about living here — nearby parks, transit, restaurants, vibe.</p>
            <textarea
              value={form.neighborhood_description}
              onChange={(e) => update('neighborhood_description', e.target.value)}
              placeholder="A quiet street with trendy cafes and easy access to the subway…"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Property specs</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Monthly Rent ($)</label>
            <input
              type="number"
              min={1}
              value={form.monthly_rent}
              onChange={(e) => update('monthly_rent', e.target.value ? Number(e.target.value) : '')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bedrooms</label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.bedrooms}
              onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : '')}
              placeholder="0 = Studio"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bathrooms</label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.bathrooms}
              onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : '')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sqft <span className="text-slate-300">(optional)</span></label>
            <input
              type="number"
              min={0}
              value={form.sqft}
              onChange={(e) => update('sqft', e.target.value ? Number(e.target.value) : '')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Features</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">
          Select everything this property has. Only selected features are shown to renters.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LISTING_FEATURES.map((f) => {
            const selected = form.features.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    features: selected
                      ? prev.features.filter((x) => x !== f)
                      : [...prev.features, f],
                  }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  selected
                    ? 'border-[#0F766E] bg-[#0F766E]/[0.08] text-[#0F766E]'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_ICONS[f] ?? FALLBACK_FEATURE_ICON} />
                </svg>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Photos</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">Up to 5 photos. First photo is the main image.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {form.photos.map((url, i) => (
            <div key={i} className="relative h-24 w-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-[10px] font-bold hover:bg-black/80"
                aria-label={`Remove photo ${i + 1}`}
              >
                ✕
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {i + 1}
              </span>
            </div>
          ))}

          {form.photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-400 transition-colors hover:border-[#0F766E] hover:text-[#0F766E] disabled:opacity-50"
            >
              {uploading ? (
                <span className="text-[10px]">Uploading…</span>
              ) : (
                <>
                  <svg className="mb-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add photo
                </>
              )}
            </button>
          )}
        </div>

        {uploadProgress.length > 0 && (
          <div className="mt-2 text-[11px] text-slate-400">
            Uploading: {uploadProgress.join(', ')}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-slate-900">Location on map</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">
          Drop a pin to show renters exactly where the property is.
        </p>
        <div className="mt-4">
          <MapPicker
            initialLat={form.latitude}
            initialLng={form.longitude}
            onLocationChange={(lat, lng) => {
              setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-xl bg-[#0F766E] px-8 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#0D9488] disabled:opacity-50"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
