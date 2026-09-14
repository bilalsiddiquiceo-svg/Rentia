'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import {
  getConversation,
  type ConversationDetail,
} from '@/lib/messages';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatSkeleton } from '@/components/Skeleton';

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    setLoading(true);

    getConversation(params.id)
      .then((c) => {
        if (!cancelled) setConversation(c);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Conversation not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return <ChatSkeleton />;
  }

  if (error || !conversation) {
    return (
      <div className="mx-auto my-12 max-w-sm rounded-3xl border border-slate-100 bg-white p-12 text-center">
        <h1 className="text-lg font-semibold text-slate-800">Conversation not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error || 'This conversation may no longer exist.'}</p>
        <Link
          href="/app/messages"
          className="mt-6 inline-block rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D9488]"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  const isPropertyInactive = conversation.property.status !== 'active';

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Fixed header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={() => router.push('/app/messages')}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-2 pl-3 pr-4 text-[13px] font-semibold text-slate-700 shadow-sm transition-all hover:border-[#0F766E]/30 hover:bg-[#0F766E]/[0.04] hover:text-[#0F766E]"
              aria-label="Back to messages"
            >
              <svg className="h-4 w-4 -ml-0.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span className="hidden sm:inline">Back to messages</span>
            </button>
            {/* Property image and title */}
            {conversation.property.photo && (
              <img
                src={conversation.property.photo}
                alt={conversation.property.title}
                className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200/60"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-800">{conversation.property.title}</p>
            </div>
          </div>
          {/* Right side: we can add status indicators here if needed */}
        </div>
      </div>

      {/* Inactive property banner */}
      {isPropertyInactive && (
        <div className="flex items-center gap-2 border-b border-orange-100 bg-orange-50 px-4 py-2 text-[12px] text-orange-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
          </svg>
          This property is no longer available, but you can still view and continue this conversation.
        </div>
      )}

      {/* Property context bar (location and rent) */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/50 bg-slate-50/70">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          <svg className="h-3.5 w-3.5 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {conversation.property.city}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75h19.5v11.25a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75Zm0 3h19.5M9 13.5h6" />
          </svg>
          <span className="tabular-nums">${conversation.property.monthlyRent.toLocaleString()}<span className="font-medium text-emerald-500">/mo</span></span>
        </div>
      </div>

      {/* Chat window with padding and background */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 bg-slate-50">
        <ChatWindow
          conversationId={conversation.id}
          otherUser={conversation.otherUser}
        />
      </div>
    </div>
  );
}
