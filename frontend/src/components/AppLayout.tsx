'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';

const NAV_ITEMS = [
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
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    label: 'List Property',
    href: '/become-owner',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();

  const startEdit = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<{ user: any }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      });
      if (res.user) updateUser(res.user);
      setEditing(false);
      toast('Profile updated', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-xs font-extrabold text-white">
            R
          </Link>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-slate-800">Rentia</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2.5 py-3">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#0F766E]/10 text-[#0F766E]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className={`shrink-0 ${active ? 'text-[#0F766E]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-slate-100 p-2.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-[68px]' : 'ml-60'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div />
          <div className="flex items-center gap-3">
            {/* Profile button */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-[10px] font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden font-medium text-slate-700 sm:block">{user?.name || user?.email?.split('@')[0]}</span>
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setProfileOpen(false); setEditing(false); }}></div>
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                    {!editing ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-sm font-bold text-white">
                            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{user?.name || 'No name set'}</div>
                            <div className="text-xs text-slate-500">{user?.email}</div>
                            {user?.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0F766E]/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-[#0F766E]">
                            {user?.role === 'owner' ? 'Owner' : 'Renter'}
                          </span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button onClick={startEdit} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200">
                            Edit Profile
                          </button>
                          <button onClick={() => { logout(); setProfileOpen(false); }} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                            Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-slate-800">Edit Profile</h3>
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">Name</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]/20"
                              placeholder="Your name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500">Phone</label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]/20"
                              placeholder="Your phone number"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500">Email</label>
                            <input
                              type="email"
                              value={user?.email || ''}
                              disabled
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-400"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                            Cancel
                          </button>
                          <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="flex-1 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#0D9488] disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
