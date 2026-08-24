'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { User } from '@/context/auth-context';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { NotificationBell } from '@/components/NotificationBell';
import { useRealtime } from '@/context/realtime-context';
import { AgentWidget } from '@/components/AgentWidget';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Browse',
    href: '/app',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    label: 'My Leases',
    href: '/app/leases',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    label: 'Favorites',
    href: '/app/favorites',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    label: 'Messages',
    href: '/app/messages',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9l9 6 9-6"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5v5.25m6-5.25v5.25" />
      </svg>
    ),
  },
  {
    label: 'Agent',
    href: '/dashboard/agent',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/app') return 'Browse Properties';
  if (pathname === '/app/favorites') return 'Saved Homes';
  if (pathname === '/app/messages') return 'Messages';
  if (pathname.startsWith('/app/messages/')) return 'Chat';
  if (pathname.startsWith('/dashboard/properties') && pathname.endsWith('/edit')) return 'Edit Property';
  if (pathname.startsWith('/dashboard/properties')) return 'Add Property';
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/dashboard/agent') return 'Rentia Agent';
  if (pathname === '/dashboard/subscriptions') return 'Subscriptions';
  if (pathname.startsWith('/property/')) return 'Property Details';
  return 'Rentia';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const pathname = usePathname();
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const { messageCount } = useRealtime();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarOpen(false);
    }
  }, [pathname]);

  const startEdit = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      });
      if (res.user) updateUser(res.user);
      setEditing(false);
      toast('Profile updated', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFB]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[2px] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64 shadow-lg shadow-slate-200/50' : 'w-[72px]'
        }`}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <nav className="flex-1 overflow-y-auto px-3 py-4 pt-6">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/app'
                  ? pathname === '/app'
                  : item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!sidebarOpen) { e.preventDefault(); setSidebarOpen(true); return; }
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  title={item.label}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    sidebarOpen ? '' : 'justify-center px-2'
                  } ${
                    active
                      ? 'bg-[#0F766E]/[0.08] text-[#0F766E]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className={`shrink-0 relative transition-colors ${active ? 'text-[#0F766E]' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    {item.icon}
                    {item.href === '/app/messages' && messageCount > 0 && (
                      <span className="absolute -right-1 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0F766E] px-1 text-[10px] font-bold text-white shadow-md notification-badge-pulse">
                        {messageCount > 99 ? '99+' : messageCount}
                      </span>
                    )}
                  </span>
                  {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setProfileOpen(!profileOpen);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${sidebarOpen ? '' : 'justify-center px-2'}`}
            title={user?.email}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-[11px] font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-[13px] font-medium text-slate-700">{user?.name || user?.email?.split('@')[0]}</div>
                <div className="truncate text-[11px] text-slate-400">{user?.email}</div>
              </div>
            )}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setProfileOpen(false); setEditing(false); }} />
              <div className="absolute bottom-full left-3 z-50 mb-2 w-[calc(100%-24px)] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl shadow-black/10">
                {!editing ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-sm font-bold text-white">
                        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{user?.name || 'No name set'}</div>
                        <div className="truncate text-xs text-slate-400">{user?.email}</div>
                        {user?.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0F766E]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0F766E]">
                        {user?.role === 'owner' ? 'Owner' : 'Renter'}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={startEdit} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200">Edit Profile</button>
                      <button onClick={() => { logout(); setProfileOpen(false); }} className="rounded-xl border border-red-100 px-4 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50">Sign Out</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-[13px] font-semibold text-slate-800">Edit Profile</h3>
                    <div className="mt-3.5 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10" placeholder="Your name" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Phone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10" placeholder="Your phone number" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email</label>
                        <input type="email" value={user?.email || ''} disabled className="mt-1 w-full rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50">Cancel</button>
                      <button onClick={saveProfile} disabled={saving} className="flex-1 rounded-xl bg-[#0F766E] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#0D9488] disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      <div className={`flex min-h-screen w-full flex-1 flex-col transition-[margin] duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]'}`}>
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-100 bg-white/80 backdrop-blur-xl px-4">
          <h1 className="justify-self-start truncate text-lg font-bold tracking-tight text-slate-800 sm:text-xl">{getPageTitle(pathname)}</h1>
          <Link href="/" onClick={(e) => e.stopPropagation()} className="justify-self-center" title="Rentia">
            <img src="/logo.png" alt="Rentia Logo" className="h-11 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 justify-self-end">
            <NotificationBell />
            <AgentWidget />
          </div>
        </header>

        <main className="flex-1">
          {pathname === '/dashboard/agent' ? (
            <div className="h-[calc(100dvh-4rem)]">{children}</div>
          ) : pathname.startsWith('/app/messages/') ? (
            <div className="h-[calc(100dvh-4rem)]">{children}</div>
          ) : pathname === '/app/messages' || pathname === '/app/leases' ? (
            <>{children}</>
          ) : (
            <div className="mx-auto w-full max-w-[1200px] px-6 py-6 sm:px-8 sm:py-8">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
