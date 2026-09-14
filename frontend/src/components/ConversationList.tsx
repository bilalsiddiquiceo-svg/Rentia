'use client';

import React from 'react';
import { Skeleton } from '@/components/Skeleton';
import type { ConversationListItem } from '@/lib/messages';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface ConversationListProps {
  conversations: ConversationListItem[];
  activeId?: string;
  currentUserId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  currentUserId,
  loading,
  onSelect,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E]/[0.06]">
          <svg className="h-7 w-7 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">No messages yet</p>
        <p className="mt-1 text-xs text-slate-400">Start a conversation from any property page</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {conversations.map((c) => {
        const isActive = c.id === activeId;
        const hasUnread = c.unreadCount > 0;
        const isInactive = c.property.status !== 'active';

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`conversation-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150 ${
              isActive
                ? 'bg-[#0F766E]/[0.08] ring-1 ring-[#0F766E]/20'
                : 'hover:bg-slate-50'
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white ${
                isInactive
                  ? 'bg-slate-300'
                  : 'bg-gradient-to-br from-[#0F766E] to-[#2DD4BF]'
              }`}>
                {c.otherUser.name?.charAt(0)?.toUpperCase() ?? c.otherUser.email.charAt(0).toUpperCase()}
              </div>
              {hasUnread && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#0F766E] px-1 text-[9px] font-bold text-white shadow-sm notification-badge-pulse">
                  {c.unreadCount > 9 ? '9+' : c.unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-[13px] ${hasUnread ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                  {c.otherUser.name ?? c.otherUser.email.split('@')[0]}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="truncate text-[11px] text-slate-400">
                  {c.property.title}
                  {isInactive && <span className="ml-1 text-[10px] text-red-400">(no longer available)</span>}
                </span>
              </div>
              {c.lastMessage && (
                <p className={`mt-0.5 truncate text-[12px] ${hasUnread ? 'font-medium text-slate-600' : 'text-slate-400'}`}>
                  {c.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                  {c.lastMessage.text || 'Photo'}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
