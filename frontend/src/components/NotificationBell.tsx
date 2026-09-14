'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/context/realtime-context';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications';
import { Skeleton } from '@/components/Skeleton';
import type { Notification } from '@/lib/notifications';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { notificationCount, refreshNotificationCount } = useRealtime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 10 });
      setItems(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.readAt) {
      markNotificationRead(n.id)
        .then(() => refreshNotificationCount())
        .catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: now })));
    try {
      await markAllNotificationsRead();
    } catch {
      // ignore; refetch will reconcile server state
    } finally {
      refreshNotificationCount();
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="Notifications"
      >
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {notificationCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0F766E] px-1 text-[10px] font-bold text-white shadow-md notification-badge-pulse">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-100 bg-white/90 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {notificationCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#0F766E] transition-colors hover:text-[#0D9488]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No notifications yet</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                    !n.readAt ? 'bg-[#0F766E]/[0.03]' : ''
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.readAt ? 'bg-[#0F766E]' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug text-slate-800">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
