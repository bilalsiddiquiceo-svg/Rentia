'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useToast } from '@/components/Toast';
import { MapPicker } from '@/components/MapPicker';
import { LeafletMap } from '@/components/LeafletMap';
import {
  getAgentStatus,
  getAgentHistory,
  sendAgentChat,
  confirmListingEdit,
  confirmListingCreate,
  confirmStatusChange,
  confirmImagesChange,
  cancelAgentProposal,
  resetAgentConversation,
  presignPropertyUpload,
  type ListingProposal,
  type ChatLocation,
  type AgentHistoryItem,
} from '@/lib/agent';
import { FEATURE_ICONS, FALLBACK_FEATURE_ICON } from '@/lib/features';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ [index: number]: { transcript: string }; isFinal: boolean }>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: (stream?: MediaStream | null) => void;
  stop: () => void;
  abort: () => void;
}

interface VoiceSession {
  rec: SpeechRecognitionLike;
  stream: MediaStream | null;
  audioCtx: AudioContext | null;
  analyser: AnalyserNode | null;
  rafId: number;
  base: string;
  finalSoFar: string;
  lastIndex: number;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AC ? new AC() : null;
}

// Web Audio tones only — no audio files. Very short and soft.
function playCue(freqs: number[], gain: number) {
  const ctx = getAudioContext();
  if (!ctx || document.hidden) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const start = ctx.currentTime + 0.01;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t0 = start + i * 0.09;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);
  });
}

const playSendSound = () => playCue([523.25, 659.25], 0.045);
const playReplySound = () => playCue([392.0, 329.63], 0.04);

// Longest suffix of `a` that is also a prefix of `b` (case-insensitive).
function suffixOverlapLength(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  for (let ol = Math.min(la.length, lb.length); ol > 0; ol -= 1) {
    if (la.slice(la.length - ol) === lb.slice(0, ol)) return ol;
  }
  return 0;
}

// With continuous recognition the interim transcript repeats part of the
// already-finalized text; strip the longest overlapping suffix so live text
// reads cleanly.
function stripOverlapPrefix(interim: string, final: string): string {
  const t = interim.trim();
  const f = final.trim();
  if (!f) return t;
  const lt = t.toLowerCase();
  const lf = f.toLowerCase();
  for (let ol = Math.min(t.length, f.length); ol > 0; ol -= 1) {
    if (lf.slice(f.length - ol) === lt.slice(0, ol)) return t.slice(ol).trim();
  }
  return t;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
  proposals?: ListingProposal[] | null;
  location?: ChatLocation | null;
}

const PROPOSAL_MARKERS: Record<ListingProposal['type'], string> = {
  edit: 'LISTING_EDIT',
  status: 'LISTING_STATUS',
  images: 'LISTING_IMAGES',
  create: 'LISTING_CREATE',
};

const PROPOSAL_INTRO =
  "I've prepared the changes for your review — approve them below and I'll apply them.";

function parseProposals(content: string): ListingProposal[] | null {
  const proposals: ListingProposal[] = [];
  const seen = new Set<string>();
  for (const line of content.split('\n')) {
    for (const type of ['edit', 'status', 'images', 'create'] as const) {
      const prefix = `${PROPOSAL_MARKERS[type]} `;
      if (line.startsWith(prefix)) {
        try {
          const p = JSON.parse(line.slice(prefix.length)) as ListingProposal;
          const key = `${p.type}:${p.propertyId}`;
          if (!seen.has(key)) {
            seen.add(key);
            proposals.push(p);
          }
        } catch {
          // malformed marker — ignore
        }
      }
    }
  }
  return proposals.length > 0 ? proposals : null;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  neighborhoodDescription: 'Neighborhood description',
  address: 'Address',
  city: 'City',
  neighborhood: 'Neighborhood',
  monthlyRent: 'Monthly rent',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  sqft: 'Square feet',
  latitude: 'Latitude',
  longitude: 'Longitude',
};

function formatFieldValue(key: string, value: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'monthlyRent') return `$${Number(value).toLocaleString()}/mo`;
  if (key === 'latitude' || key === 'longitude') return Number(value).toFixed(6);
  return String(value);
}

function SparklesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

function SendIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function PhotoIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

function PinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="h-2 w-2 animate-bounce rounded-full bg-[#0F766E]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-[#14B8A6] [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-[#0F766E] [animation-delay:300ms]" />
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={k++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={k++} className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em] text-[#0F766E]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(<em key={k++}>{token.slice(1, -1)}</em>);
    } else {
      const [, label, href] = token.match(/\[([^\]]+)\]\(([^)]+)\)/) ?? [null, token, '#'];
      nodes.push(
        <a key={k++} href={href} target="_blank" rel="noreferrer" className="text-[#0F766E] underline">
          {label}
        </a>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const cls =
        heading[1].length === 1
          ? 'mt-2 text-[15px] font-bold text-slate-800'
          : 'mt-1.5 text-[13.5px] font-bold text-slate-800';
      blocks.push(
        <p key={`h${i}`} className={cls}>
          {renderInline(heading[2])}
        </p>,
      );
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(<li key={items.length}>{renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>);
        i += 1;
      }
      blocks.push(
        <ul key={`ul${i}`} className="mt-1 list-disc space-y-0.5 pl-4">
          {items}
        </ul>,
      );
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(<li key={items.length}>{renderInline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>);
        i += 1;
      }
      blocks.push(
        <ol key={`ol${i}`} className="mt-1 list-decimal space-y-0.5 pl-4">
          {items}
        </ol>,
      );
      continue;
    }
    blocks.push(
      <p key={`p${i}`} className={blocks.length ? 'mt-1.5' : ''}>
        {renderInline(trimmed)}
      </p>,
    );
    i += 1;
  }
  return blocks;
}

function parseMessageImages(content: string): { text: string; images?: string[] } {
  const match = content.match(/\[Attached photos: ([^\]]+)\]/);
  if (!match) return { text: content };
  const images = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { text: content.replace(` [Attached photos: ${match[1]}]`, ''), images };
}

const IMAGE_URL_RE = /https?:\/\/[^\s"'<>)\]},]+/g;

function looksLikeImage(url: string): boolean {
  return (
    /\.(jpe?g|png|webp|gif|avif|heic|bmp)([?#]|$)/i.test(url) ||
    /supabase\.co\/storage|cloudinary\.com|amazonaws\.com|storage\.googleapis\.com/i.test(url)
  );
}

function extractImageUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(IMAGE_URL_RE)) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    if (looksLikeImage(url) && !out.includes(url)) out.push(url);
  }
  return out;
}

function stripImageUrls(text: string, urls: string[]): string {
  let t = text.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_m, u: string) => ` ${u}`);
  for (const url of urls) t = t.split(url).join(' ');
  t = t.replace(/!?\s*Image\s+\d+\s*/g, ' ');
  return t.replace(/\s{2,}/g, ' ').trim();
}

function hydrateContent(content: string): { text: string; images?: string[] } {
  const { text: baseText, images: attached } = parseMessageImages(content);
  if (attached) return { text: baseText, images: attached };
  const urls = extractImageUrls(baseText);
  return { text: urls.length > 0 ? stripImageUrls(baseText, urls) : baseText, images: urls.length > 0 ? urls : undefined };
}

function mapHistoryItem(item: AgentHistoryItem): ChatMessage {
  if (
    item.role === 'assistant' &&
    (item.content.startsWith('LISTING_EDITED ') ||
      item.content.startsWith('LISTING_STATUS_CHANGED ') ||
      item.content.startsWith('LISTING_IMAGES_CHANGED '))
  ) {
    return { id: item.id, role: 'assistant', text: 'Your changes were applied successfully.' };
  }
  if (item.role === 'assistant' && item.content.startsWith('LISTING_CREATED ')) {
    return { id: item.id, role: 'assistant', text: 'Your new listing was created successfully.' };
  }
  if (item.role === 'assistant' && item.content.startsWith('LISTING_CREATE_REPLACED')) {
    return { id: item.id, role: 'assistant', text: 'This preview was replaced by a newer one.' };
  }
  const proposals = parseProposals(item.content);
  if (proposals) {
    return { id: item.id, role: 'assistant', text: PROPOSAL_INTRO, proposals };
  }
  const { text, images } = hydrateContent(item.content);
  return { id: item.id, role: item.role, text, images };
}

function ProposalTypeBadge({ type }: { type: ListingProposal['type'] }) {
  const map = {
    edit: { label: 'Edit listing', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    status: { label: 'Listing status', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    images: { label: 'Photos', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    create: { label: 'New listing', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  } as const;
  const m = map[type];
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function WalkIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.75 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12.25 9l-2.75 1.75-.75 3M12.25 9l.5 3.5L15 14v3.5m-2.25-4.5L11 16.5l-1 4M12.75 12.5l2.5 2 .75 3"
      />
    </svg>
  );
}

const CAR_PATH =
  'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12';

function CarIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={CAR_PATH} />
    </svg>
  );
}

const BADGE_CLS = [
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-amber-200 bg-amber-50 text-amber-700',
];

function FeatureBadges({ features }: { features?: string[] }) {
  if (!features || features.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {features.map((f, i) => (
        <span
          key={f}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
            BADGE_CLS[i % BADGE_CLS.length]
          }`}
          title="Confirmed from photos or owner details"
        >
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_ICONS[f] ?? FALLBACK_FEATURE_ICON} />
          </svg>
          {f}
        </span>
      ))}
    </div>
  );
}

interface NearbyItem {
  name: string;
  time: string;
}

// "Central Park — 2 min walk, City School — 5 min drive" → rows. Returns null
// when the text is not in list format so callers can fall back to a textarea.
function parseNearby(text: string): NearbyItem[] | null {
  const parts = String(text)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const items: NearbyItem[] = [];
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*[—–]\s*(\d+\s*min(?:utes?|s)?\s*(?:walk|drive)?)\.*$/i);
    if (!m) return null;
    items.push({ name: m[1].trim(), time: m[2].replace(/\s+/g, ' ').trim() });
  }
  return items;
}

function NearbyList({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const items = parseNearby(value);
  if (!items) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[11.5px] leading-relaxed text-slate-600 outline-none transition-colors hover:border-slate-200 focus:border-[#0F766E]/40 focus:bg-white"
      />
    );
  }
  const update = (i: number, patch: Partial<NearbyItem>) => {
    onChange(
      items
        .map((it, idx) => (idx === i ? { ...it, ...patch } : it))
        .map((it) => `${it.name} — ${it.time}`)
        .join(', '),
    );
  };
  return (
    <div className="rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-teal-700">
        <PinIcon className="h-3 w-3" />
        What&apos;s nearby
      </p>
      <div className="mt-1.5 space-y-1">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-[#0F766E]/15 hover:bg-white"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/10 text-[#0F766E]">
              {/drive/i.test(it.time) ? <CarIcon /> : <WalkIcon />}
            </span>
            <input
              value={it.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-slate-700 outline-none"
              aria-label="Nearby place name"
            />
            <input
              value={it.time}
              onChange={(e) => update(i, { time: e.target.value })}
              className="w-[92px] shrink-0 bg-transparent text-right text-[11px] font-semibold text-[#0F766E] outline-none"
              aria-label="Travel time"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Drag-to-reorder photo strip. Calls onReorder with the new URL sequence while
// dragging; the parent owns the order and it is what gets saved on approval.
function SortableThumbs({
  urls,
  onReorder,
  addedSet,
}: {
  urls: string[];
  onReorder?: (urls: string[]) => void;
  addedSet?: Set<string>;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const sortable = !!onReorder;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <div key={url} className="relative">
          <img
            src={url}
            alt=""
            draggable={sortable}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => {
              if (!sortable || dragIdx === null || dragIdx === i) return;
              e.preventDefault();
              const next = [...urls];
              const [moved] = next.splice(dragIdx, 1);
              next.splice(i, 0, moved);
              setDragIdx(i);
              onReorder(next);
            }}
            onDragEnd={() => setDragIdx(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragIdx(null);
            }}
            className={`h-16 w-16 rounded-xl object-cover shadow-sm transition ${
              dragIdx === i
                ? 'opacity-40 ring-2 ring-[#0F766E]'
                : sortable
                  ? 'cursor-grab border border-slate-200 active:cursor-grabbing'
                  : 'border border-slate-200'
            }`}
          />
          {sortable && (
            <span className="absolute -bottom-1.5 -left-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-md bg-slate-500 px-0.5 text-[9px] font-bold text-white shadow">
              {i + 1}
            </span>
          )}
          {addedSet?.has(url) && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
              <span className="text-[12px] font-bold leading-none">+</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const NUMERIC_KEYS = new Set(['monthlyRent', 'bedrooms', 'bathrooms', 'sqft']);

function EditRow({
  labelKey,
  label,
  was,
  children,
}: {
  labelKey: string;
  label: string;
  was?: string | number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-[#0F766E]/30 focus-within:bg-white">
      <span className="w-[38%] shrink-0 pt-1 text-[11px] font-semibold text-slate-500">
        {label}
        {was !== undefined && was !== null && was !== '' && (
          <span className="block truncate text-[10px] font-normal normal-case text-slate-400 line-through">
            {formatFieldValue(labelKey, was)}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CardInput({
  value,
  onChange,
  numeric,
}: {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <input
      value={value ?? ''}
      inputMode={numeric ? 'numeric' : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        if (numeric && raw !== '' && !/^\d+$/.test(raw)) return;
        onChange(raw);
      }}
      className="w-full border-none bg-transparent p-0 text-right text-[12.5px] font-semibold text-slate-800 outline-none ring-0 placeholder:text-right placeholder:font-normal placeholder:text-slate-300"
    />
  );
}

const toInt = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
};

function ProposalCard({
  proposals,
  approving,
  onApprove,
  onCancel,
}: {
  proposals: ListingProposal[];
  approving: boolean;
  onApprove: (proposals: ListingProposal[]) => void;
  onCancel: (proposals: ListingProposal[]) => void;
}) {
  // Editable working copy — every field the owner tweaks here is what gets
  // submitted on approval (Fixes 5 & 6).
  const [drafts, setDrafts] = useState<ListingProposal[]>(() =>
    JSON.parse(JSON.stringify(proposals)) as ListingProposal[],
  );

  const updateDraft = (pi: number, patch: Partial<ListingProposal>) =>
    setDrafts((prev) => prev.map((d, i) => (i === pi ? { ...d, ...patch } : d)));

  const updateChange = (pi: number, key: string, value: string | number | null) =>
    setDrafts((prev) =>
      prev.map((d, i) => (i === pi ? { ...d, changes: { ...(d.changes ?? {}), [key]: value } } : d)),
    );

  const totalChanges = proposals.reduce((sum, p) => {
    if (p.type === 'edit') return sum + Object.keys(p.changes ?? {}).length;
    if (p.type === 'images') {
      return sum + (p.add?.length ?? 0) + (p.removeIndices?.length ?? 0);
    }
    return sum + 1;
  }, 0);

  const multiple = proposals.length > 1;

  const handleApprove = () => {
    const final = drafts.map((d, i) => {
      const orig = proposals[i];
      if (d.type === 'create') {
        return {
          ...d,
          title: d.title?.trim() ? d.title : orig.title,
          description: d.description?.trim() ? d.description : orig.description,
          monthlyRent: toInt(d.monthlyRent) ?? toInt(orig.monthlyRent),
          bedrooms: toInt(d.bedrooms) ?? toInt(orig.bedrooms),
          bathrooms: toInt(d.bathrooms) ?? toInt(orig.bathrooms),
          sqft: toInt(d.sqft) ?? toInt(orig.sqft) ?? null,
          address: d.address?.trim() ? d.address : orig.address,
          city: d.city?.trim() ? d.city : orig.city,
          neighborhood: d.neighborhood?.trim() ? d.neighborhood : orig.neighborhood,
        };
      }
      if (d.type === 'edit' && d.changes) {
        const changes: Record<string, string | number | null> = {};
        for (const [k, v] of Object.entries(d.changes)) {
          if (NUMERIC_KEYS.has(k)) {
            const n = toInt(v);
            if (n !== undefined) changes[k] = n;
          } else if (typeof v === 'string') {
            if (v.trim() !== '') changes[k] = v;
          } else {
            changes[k] = v;
          }
        }
        return { ...d, changes };
      }
      return d;
    });
    onApprove(final);
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#0F766E]/20 bg-white shadow-md shadow-[#0F766E]/5">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#F0FDFA]/90 to-white px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-md shadow-[#0F766E]/25">
          <SparklesIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-900">Your approval needed</p>
          <p className="truncate text-[11px] text-slate-500">
            {proposals[0].type === 'create'
              ? 'Your new listing is ready — review or edit it below'
              : `${multiple ? `${proposals.length} changes` : '1 change'} are ready on your listing${
                  totalChanges > 1 ? ` · ${totalChanges} edits` : ''
                }`}
          </p>
        </div>
        <ProposalTypeBadge type={proposals[0].type} />
      </div>

      <div className="space-y-3 p-4">
        {proposals.map((p, pi) => {
          const d = drafts[pi] ?? p;
          return (
            <div
              key={`${p.type}-${p.propertyId}`}
              className={pi > 0 ? 'border-t border-dashed border-slate-200 pt-3' : ''}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="truncate text-[12.5px] font-bold text-slate-800">
                  {p.type === 'create' && d.title ? d.title : p.propertyTitle}
                </span>
                {multiple && <ProposalTypeBadge type={p.type} />}
              </div>

              {p.type === 'edit' && (
                <div className="space-y-1.5">
                  {(d.changes?.latitude !== undefined || d.changes?.longitude !== undefined) && (
                    <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
                        <PinIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold text-slate-800">
                          Move the location pin
                        </p>
                        <p className="text-[10.5px] leading-snug text-slate-500">
                          Your listing will be marked at the location you shared.
                        </p>
                      </div>
                    </div>
                  )}
                  {Object.entries(d.changes ?? {})
                    .filter(([key]) => key !== 'latitude' && key !== 'longitude')
                    .map(([key, value]) => {
                      const was = p.current?.[key];
                      if (key === 'description') {
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-[#0F766E]/30 focus-within:bg-white"
                          >
                            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                              {FIELD_LABELS[key]}
                              {was ? ' · editing' : ''}
                            </p>
                            <textarea
                              value={String(value ?? '')}
                              onChange={(e) => updateChange(pi, key, e.target.value)}
                              rows={4}
                              className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[11.5px] leading-relaxed text-slate-600 outline-none transition-colors hover:border-slate-200 focus:border-[#0F766E]/40 focus:bg-white"
                            />
                          </div>
                        );
                      }
                      if (key === 'neighborhoodDescription') {
                        return (
                          <NearbyList
                            key={key}
                            value={String(value ?? '')}
                            onChange={(v) => updateChange(pi, key, v)}
                          />
                        );
                      }
                      return (
                        <EditRow key={key} labelKey={key} label={FIELD_LABELS[key] ?? key} was={was}>
                          <CardInput
                            value={value as string | number | null}
                            numeric={NUMERIC_KEYS.has(key)}
                            onChange={(raw) =>
                              updateChange(
                                pi,
                                key,
                                NUMERIC_KEYS.has(key)
                                  ? raw === ''
                                    ? ''
                                    : Number(raw)
                                  : raw,
                              )
                            }
                          />
                        </EditRow>
                      );
                    })}
                </div>
              )}

              {p.type === 'create' && (
                <div className="space-y-2">
                  {(d.photos ?? []).length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                        Photos · drag to reorder
                      </p>
                      <div className="mt-1.5">
                        <SortableThumbs
                          urls={d.photos ?? []}
                          onReorder={(urls) => updateDraft(pi, { photos: urls })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-[#0F766E]/30 focus-within:bg-white">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                      Title
                    </p>
                    <input
                      value={d.title ?? ''}
                      maxLength={120}
                      onChange={(e) => updateDraft(pi, { title: e.target.value })}
                      className="w-full border-none bg-transparent p-0 text-[13px] font-bold text-slate-900 outline-none ring-0"
                    />
                  </div>
                  <FeatureBadges features={d.features} />
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-[#0F766E]/30 focus-within:bg-white">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                      Property description
                    </p>
                    <textarea
                      value={d.description ?? ''}
                      maxLength={2000}
                      onChange={(e) => updateDraft(pi, { description: e.target.value })}
                      rows={4}
                      className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[11.5px] leading-relaxed text-slate-600 outline-none transition-colors hover:border-slate-200 focus:border-[#0F766E]/40 focus:bg-white"
                    />
                  </div>
                  {d.neighborhoodDescription != null && d.neighborhoodDescription !== '' && (
                    <NearbyList
                      value={d.neighborhoodDescription}
                      onChange={(v) => updateDraft(pi, { neighborhoodDescription: v })}
                    />
                  )}
                  {(
                    [
                      ['monthlyRent', 'Monthly rent', true],
                      ['bedrooms', 'Bedrooms', true],
                      ['bathrooms', 'Bathrooms', true],
                      ['sqft', 'Square feet', true],
                      ['address', 'Address', false],
                      ['city', 'City', false],
                      ['neighborhood', 'Neighborhood', false],
                    ] as [keyof ListingProposal, string, boolean][]
                  ).map(([key, label, numeric]) => (
                    <EditRow key={String(key)} labelKey={String(key)} label={label}>
                      <CardInput
                        value={(d[key] as string | number | null | undefined) ?? ''}
                        numeric={numeric}
                        onChange={(raw) =>
                          updateDraft(
                            pi,
                            numeric
                              ? ({ [key]: raw === '' ? undefined : Number(raw) } as Partial<ListingProposal>)
                              : ({ [key]: raw } as Partial<ListingProposal>),
                          )
                        }
                      />
                    </EditRow>
                  ))}
                  {d.latitude != null && d.longitude != null && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                      <span className="w-[38%] shrink-0 truncate pt-px text-[11px] font-semibold text-slate-500">
                        Location pin
                      </span>
                      <span className="min-w-0 flex-1 text-right text-[11.5px] font-semibold leading-snug text-slate-700">
                        {Number(d.latitude).toFixed(4)}, {Number(d.longitude).toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {p.type === 'status' && (
                <div
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    p.status === 'active'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-amber-200 bg-amber-50/70'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
                      p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  >
                    {p.status === 'active' ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[12.5px] font-bold ${
                        p.status === 'active' ? 'text-emerald-800' : 'text-amber-800'
                      }`}
                    >
                      {p.status === 'active' ? 'Activate listing' : 'Deactivate listing'}
                    </p>
                    <p className="text-[10.5px] leading-snug text-slate-500">
                      {p.status === 'active'
                        ? 'It will reappear in public browsing for new bookings.'
                        : 'It will be hidden from public browsing. Bookings already made stay valid.'}
                    </p>
                  </div>
                </div>
              )}

              {p.type === 'images' && (
                <div>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">{p.currentPhotos?.length ?? 0}</span>{' '}
                    current →
                    <span className="font-semibold text-emerald-700">
                      {' '}
                      {(d.resultPhotos ?? []).length} after
                    </span>
                    {(p.removeIndices?.length ?? 0) > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        ✕ {p.removeIndices?.length} removed
                      </span>
                    )}
                    {(p.add?.length ?? 0) > 0 && (
                      <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        + {p.add?.length} added
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    New sequence · drag to reorder — saved in this exact order on approval
                  </p>
                  <div className="mt-1.5">
                    <SortableThumbs
                      urls={d.resultPhotos ?? []}
                      addedSet={new Set(p.add ?? [])}
                      onReorder={(urls) => updateDraft(pi, { resultPhotos: urls })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <button
          onClick={() => onCancel(proposals)}
          disabled={approving}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-red-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <XIcon className="h-4 w-4" />
          Cancel
        </button>
        <p className="hidden text-[10.5px] leading-snug text-slate-400 sm:block">
          Edit any field above — approval saves exactly what you see.
        </p>
        <button
          onClick={handleApprove}
          disabled={approving}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-[#0F766E]/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <CheckIcon className="h-4 w-4" />
          {approving ? 'Applying…' : proposals[0].type === 'create' ? 'Approve & create' : 'Approve & apply'}
        </button>
      </div>
    </div>
  );
}

export interface AgentChatHandle {
  resetConversation: () => void;
}

interface AgentChatProps {
  className?: string;
  onLapsed?: () => void;
}

export const AgentChat = forwardRef<AgentChatHandle, AgentChatProps>(function AgentChat(
  { className = 'flex-1', onLapsed },
  ref,
) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const historyCursorRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const lastLocationRef = useRef<ChatLocation | undefined>(undefined);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
  }, []);

  const resizeComposer = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  // Restore persisted conversation — loads the LAST page, older pages load
  // as the user scrolls up.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHasMoreHistory(true);
    historyCursorRef.current = null;
    getAgentHistory({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.items.map(mapHistoryItem));
        setHasMoreHistory(res.hasMore);
        historyCursorRef.current = res.nextCursor;
      })
      .catch((err) => {
        if (cancelled) return;
        if ((err as { status?: number })?.status === 403) onLapsed?.();
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLapsed]);

  // Anchor to the bottom of the chat container itself — never the page.
  useEffect(() => {
    if (historyLoading) return;
    scrollToBottom(false);
  }, [historyLoading, scrollToBottom]);

  useEffect(() => {
    if (historyLoading) return;
    if (prependingRef.current) return;
    scrollToBottom(messages.length > 0);
  }, [messages, streaming, historyLoading, scrollToBottom]);

  // Load older history on scroll-up — preserves the anchored scroll position
  // so the view stays on the same messages instead of jumping to the newest.
  const prependingRef = useRef(false);
  const loadMoreHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory || historyLoading) return;
    if (messages.length === 0) return;
    const cursor = historyCursorRef.current;
    if (!cursor) return;
    setLoadingMoreHistory(true);
    const container = containerRef.current;
    const prevScrollTop = container?.scrollTop ?? 0;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const res = await getAgentHistory({ before: cursor, limit: 20 });
      if (res.items.length > 0) {
        prependingRef.current = true;
        setMessages((prev) => [
          ...res.items.map(mapHistoryItem).filter((m) => !prev.some((p) => p.id === m.id)),
          ...prev,
        ]);
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop =
              prevScrollTop + (container.scrollHeight - prevScrollHeight);
          });
        }
      }
      setHasMoreHistory(res.hasMore);
      historyCursorRef.current = res.nextCursor;
    } catch {
      // ignore
    } finally {
      prependingRef.current = false;
      setLoadingMoreHistory(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => {
      if (container.scrollTop < 80) loadMoreHistory();
    };
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMoreHistory, hasMoreHistory, historyLoading, messages.length]);

  useEffect(() => {
    return () => {
      const s = voiceSessionRef.current;
      if (s) {
        try {
          s.rec.stop();
        } catch {
          // already stopped
        }
        stopVoice(s);
        voiceSessionRef.current = null;
      }
    };
  }, []);

  const recoverIfLapsed = async (err: unknown): Promise<boolean> => {
    if ((err as { status?: number } | null)?.status !== 403) return false;
    const s = await getAgentStatus().catch(() => null);
    if (s && !s.active) {
      onLapsed?.();
      return true;
    }
    return false;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const photos = pendingPhotos.length > 0 ? [...pendingPhotos] : undefined;
    setInput('');
    if (photos) setPendingPhotos([]);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text, images: photos },
    ]);
    playSendSound();
    setStreaming(true);
    try {
      const { reply } = await sendAgentChat(text, lastLocationRef.current, photos);
      const proposals = parseProposals(reply);
      if (proposals) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: PROPOSAL_INTRO,
            proposals,
          },
        ]);
      } else {
        const { text: replyText, images } = hydrateContent(reply);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: replyText, images },
        ]);
      }
      playReplySound();
    } catch (err) {
      if (await recoverIfLapsed(err)) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (pendingPhotos.length + files.length > 5) {
      toast('You can attach up to 5 photos', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const { uploadUrl, publicUrl } = await presignPropertyUpload(file.name, file.type);
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!res.ok) throw new Error('Upload failed');
        urls.push(publicUrl);
      }
      setPendingPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Photo upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApproveProposals = async (messageId: string, proposals: ListingProposal[]) => {
    setApprovingId(messageId);
    try {
      for (const p of proposals) {
        if (p.type === 'edit') {
          await confirmListingEdit(p.propertyId, p.changes ?? {});
        } else if (p.type === 'status') {
          await confirmStatusChange(p.propertyId, p.status ?? 'inactive');
        } else if (p.type === 'images') {
          await confirmImagesChange(p.propertyId, p.resultPhotos ?? []);
        } else {
          await confirmListingCreate(p);
        }
      }
      const created = proposals[0]?.type === 'create';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                proposals: null,
                text: created
                  ? 'Your new listing was created successfully.'
                  : 'Your changes were applied successfully.',
              }
            : m,
        ),
      );
      toast(created ? 'Listing created' : 'Changes applied', 'success');
    } catch (err) {
      if (await recoverIfLapsed(err)) return;
      toast(err instanceof Error ? err.message : 'Could not apply the changes', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancelProposals = async (messageId: string, _proposals: ListingProposal[]) => {
    setApprovingId(messageId);
    try {
      await cancelAgentProposal();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, proposals: null, text: 'The proposed change was cancelled — nothing was applied.' }
            : m,
        ),
      );
      toast('Proposal cancelled', 'success');
    } catch (err) {
      if (await recoverIfLapsed(err)) return;
      toast(err instanceof Error ? err.message : 'Could not cancel the proposal', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleNewConversation = useCallback(async () => {
    if (streaming) return;
    if (!window.confirm('Start a new conversation? This will clear your chat history.')) return;
    try {
      await resetAgentConversation();
      setMessages([]);
      setHasMoreHistory(true);
      setPendingPhotos([]);
      setInput('');
      scrollToBottom(false);
      toast('Conversation cleared', 'success');
    } catch (err) {
      if (await recoverIfLapsed(err)) return;
      toast(err instanceof Error ? err.message : 'Could not reset the conversation', 'error');
    }
  }, [streaming, recoverIfLapsed, scrollToBottom, toast]);

  useImperativeHandle(ref, () => ({ resetConversation: handleNewConversation }), [
    handleNewConversation,
  ]);

  const stopVoice = (s: VoiceSession) => {
    if (s.rafId) cancelAnimationFrame(s.rafId);
    if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
    if (s.audioCtx && s.audioCtx.state !== 'closed') {
      void s.audioCtx.close().catch(() => {});
    }
  };

  const drawWaveform = (s: VoiceSession) => {
    const canvas = waveformRef.current;
    if (!canvas || !s.analyser) {
      s.rafId = requestAnimationFrame(() => drawWaveform(s));
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const g = canvas.getContext('2d');
    if (!g) {
      s.rafId = requestAnimationFrame(() => drawWaveform(s));
      return;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const data = new Uint8Array(s.analyser.fftSize);
    s.analyser.getByteTimeDomainData(data);
    const bars = 28;
    const gap = 3;
    const barW = (width - gap * (bars - 1)) / bars;
    const mid = height / 2;
    for (let i = 0; i < bars; i += 1) {
      const v = data[Math.floor((i / bars) * data.length)];
      const amp = Math.abs(v - 128) / 128;
      const h = Math.max(3, amp * height);
      const x = i * (barW + gap);
      g.fillStyle = '#14B8A6';
      g.beginPath();
      g.roundRect(x, mid - h / 2, barW, h, barW / 2);
      g.fill();
    }
    s.rafId = requestAnimationFrame(() => drawWaveform(s));
  };

  const startVoice = () => {
    if (voiceSessionRef.current) return;
    const SR = getSpeechRecognition();
    if (!SR) {
      toast('Voice input is not supported in this browser.', 'error');
      return;
    }

    const session: VoiceSession = {
      rec: new SR(),
      stream: null,
      audioCtx: null,
      analyser: null,
      rafId: 0,
      base: input.trim(),
      finalSoFar: '',
      lastIndex: -1,
    };
    const rec = session.rec;
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = true;

    rec.onresult = (e) => {
      let interim = '';
      let finalDelta = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) {
          if (i <= session.lastIndex) continue;
          session.lastIndex = i;
          finalDelta += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (finalDelta) {
        const delta = finalDelta.trim();
        const rest = delta.slice(suffixOverlapLength(session.finalSoFar, delta)).trim();
        if (rest) session.finalSoFar += (session.finalSoFar ? ' ' : '') + rest;
      }
      const live = stripOverlapPrefix(interim, session.finalSoFar);
      const tail = [session.finalSoFar, live].filter(Boolean).join(' ');
      setInput((cur) => cur.slice(0, session.base.length) + tail);
    };
    rec.onend = () => {
      const s = voiceSessionRef.current;
      if (!s) return; // stopped via ✕/✓
      // Ended on its own (timeout/error). Keep what was transcribed.
      stopVoice(s);
      voiceSessionRef.current = null;
      setVoiceOn(false);
    };
    rec.onerror = (e) => {
      const s = voiceSessionRef.current;
      if (!s) return;
      const code = e?.error ?? '';
      let msg: string;
      switch (code) {
        case 'not-allowed':
        case 'service-not-allowed':
          msg = 'Microphone access was denied. Allow mic access and try again.';
          break;
        case 'no-speech':
          msg = 'No speech was detected. Try again.';
          break;
        case 'network':
          msg = 'Speech recognition failed due to a network error. Check your connection and try again.';
          break;
        case 'audio-capture':
          msg = 'No microphone was found. Connect a mic and try again.';
          break;
        case 'aborted':
          msg = 'Recording was interrupted. Try again.';
          break;
        default:
          msg = 'Voice input failed. Try again.';
      }
      stopVoice(s);
      voiceSessionRef.current = null;
      setVoiceOn(false);
      setInput(s.base);
      toast(msg, 'error');
    };

    voiceSessionRef.current = session;
    setVoiceOn(true);
    // Start recognition synchronously in the click handler (Chrome can silently
    // drop start() called from an async continuation) with a plain start(); the
    // waveform captures its own single getUserMedia stream for analysis only.
    try {
      rec.start();
    } catch (err) {
        console.error(err);
        stopVoice(session);
        voiceSessionRef.current = null;
        setVoiceOn(false);
        toast(err instanceof Error ? err.message : 'Could not start voice input. Try again.', 'error');
        return;
      }
      navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const s = voiceSessionRef.current;
        if (!s) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = getAudioContext();
        if (!ctx) {
          stream.getTracks().forEach((t) => t.stop());
          stopVoice(s);
          voiceSessionRef.current = null;
          setVoiceOn(false);
          return;
        }
        if (ctx.state === 'suspended') void ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        s.stream = stream;
        s.audioCtx = ctx;
        s.analyser = analyser;
        drawWaveform(s);
      })
      .catch(() => {
        toast('Microphone access was denied. Allow mic access and try again.', 'error');
      });
  };

  const cancelVoice = () => {
    const s = voiceSessionRef.current;
    if (!s) return;
    try {
      s.rec.stop();
    } catch {
      // ignore
    }
    stopVoice(s);
    voiceSessionRef.current = null;
    setVoiceOn(false);
    setInput(s.base);
  };

  const confirmVoice = () => {
    const s = voiceSessionRef.current;
    if (!s) return;
    try {
      s.rec.stop();
    } catch {
      // ignore
    }
    stopVoice(s);
    voiceSessionRef.current = null;
    setVoiceOn(false);
  };

  const openLocationPicker = () => {
    setPicked(null);
    setPickerOpen(true);
    // Best-effort: center the map on the user's location (never sent unless picked).
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPickerKey((k) => k + 1);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000 },
      );
    }
  };

  const sendPickedLocation = async () => {
    if (!picked) return;
    const location: ChatLocation = { latitude: picked.lat, longitude: picked.lng };
    lastLocationRef.current = location;
    const text = picked.address ? `Shared my location: ${picked.address}` : 'Shared my location.';
    setPickerOpen(false);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text, location },
    ]);
    playSendSound();
    setStreaming(true);
    try {
      const { reply } = await sendAgentChat(text, location);
      const proposals = parseProposals(reply);
      const assistant = proposals
        ? { id: `a-${Date.now()}`, role: 'assistant' as const, text: PROPOSAL_INTRO, proposals }
        : { id: `a-${Date.now()}`, role: 'assistant' as const, ...hydrateContent(reply) };
      setMessages((prev) => [...prev, assistant]);
      playReplySound();
    } catch (err) {
      if (await recoverIfLapsed(err)) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`agent-chat flex min-h-0 flex-col ${className}`}>
      <div
        ref={containerRef}
        className="relative z-10 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
      >
        {historyLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#22D3EE] text-white shadow-xl shadow-[#0F766E]/25">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-emerald-400 ring-4 ring-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hi, how can I help you today?</h3>
              <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                Ask about your wallet, leases, disputes or performance — or send photos to draft a
                new listing.
              </p>
            </div>
          </div>
        ) : null}

        {loadingMoreHistory && (
          <div className="flex justify-center py-1">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] space-y-2">
                {m.location && (
                  <div className="ml-auto w-[240px] overflow-hidden rounded-2xl border border-slate-200 shadow-md">
                    <LeafletMap
                      latitude={m.location.latitude}
                      longitude={m.location.longitude}
                      height="140px"
                      popup="Shared location"
                    />
                  </div>
                )}
                {m.images && m.images.length > 0 && (
                  <div className="flex justify-end gap-1.5">
                    {m.images.slice(0, 5).map((url) => (
                      <img key={url} src={url} alt="" className="h-16 w-16 rounded-xl border border-slate-200 object-cover shadow-md" />
                    ))}
                  </div>
                )}
                <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-[#0F766E] to-[#14B8A6] px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-lg shadow-[#0F766E]/20">
                  {m.text}
                </div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-md shadow-[#0F766E]/20">
                <SparklesIcon className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[85%] space-y-2.5">
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.images.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover shadow-sm"
                      />
                    ))}
                  </div>
                )}
                {m.text && (
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] leading-relaxed text-slate-700 shadow-sm">
                    {renderMarkdown(m.text)}
                  </div>
                )}
                {m.proposals && m.proposals.length > 0 && (
                  <ProposalCard
                    proposals={m.proposals}
                    approving={approvingId === m.id}
                    onApprove={(ps) => handleApproveProposals(m.id, ps)}
                    onCancel={(ps) => handleCancelProposals(m.id, ps)}
                  />
                )}
              </div>
            </div>
          ),
        )}

        {(streaming) && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-md shadow-[#0F766E]/20">
              <SparklesIcon className="h-3.5 w-3.5" />
            </div>
            <TypingDots />
          </div>
        )}
      </div>

      {pendingPhotos.length > 0 && (
        <div className="relative z-10 mx-3 mb-2 flex items-center gap-2 overflow-x-auto rounded-2xl border border-[#0F766E]/20 bg-white/90 p-2.5 shadow-sm backdrop-blur-md sm:mx-4">
          {pendingPhotos.map((url, i) => (
            <div key={url} className="relative shrink-0">
              <img src={url} alt="" className="h-14 w-14 rounded-xl border border-slate-200 object-cover" />
              <button
                onClick={() => setPendingPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow transition hover:bg-red-500"
                title="Remove photo"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 shrink-0 border-t border-slate-100 bg-white/80 px-3 py-3 backdrop-blur-xl sm:px-4">
        {voiceOn && (
          <canvas
            ref={waveformRef}
            className="mb-2 h-9 w-full rounded-xl border border-[#0F766E]/20 bg-white/70"
          />
        )}
        <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 transition-colors focus-within:border-[#0F766E]/40 focus-within:ring-2 focus-within:ring-[#0F766E]/10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || uploading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F766E] disabled:opacity-40"
            title="Attach photos"
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#0F766E]" />
            ) : (
              <PhotoIcon />
            )}
          </button>
          <button
            onClick={openLocationPicker}
            disabled={streaming}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F766E] disabled:opacity-40"
            title="Share a location"
          >
            <PinIcon />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your properties…"
            rows={1}
            className="flex-1 resize-none border-none bg-transparent py-1.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            style={{ maxHeight: '120px', minHeight: '24px', boxShadow: 'none' }}
          />
          {voiceOn ? (
            <>
              <button
                onClick={cancelVoice}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition hover:bg-red-500/20"
                title="Cancel recording and clear text"
              >
                <XIcon className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={confirmVoice}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-md shadow-[#0F766E]/20 transition hover:brightness-110 active:scale-95"
                title="Keep text and stop recording"
              >
                <CheckIcon className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startVoice}
                disabled={streaming}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F766E] disabled:opacity-40"
                title="Speak your message"
              >
                <MicIcon />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-md shadow-[#0F766E]/20 transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                <SendIcon />
              </button>
            </>
          )}
        </div>
        <p className="mt-2 text-center text-[10.5px] text-slate-400">
          {voiceOn
            ? 'Listening — speak now, then tap ✓ to keep the text or ✕ to cancel.'
            : 'Rentia Agent answers from your real data — ask anything, share your location, or draft a listing from photos.'}
        </p>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-sm font-bold text-slate-800">Pick a location</h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <MapPicker
                key={pickerKey}
                initialLat={mapCenter?.lat ?? null}
                initialLng={mapCenter?.lng ?? null}
                onLocationChange={(lat, lng, address) => setPicked({ lat, lng, address })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <span className="min-w-0 truncate text-[12px] text-slate-500">
                {picked
                  ? picked.address ?? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
                  : 'Search or drag the pin to set your location'}
              </span>
              <button
                onClick={sendPickedLocation}
                disabled={!picked || streaming}
                className="shrink-0 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-[#0F766E]/20 transition hover:brightness-110 disabled:opacity-40"
              >
                Send location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});