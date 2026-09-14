'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useRealtime } from '@/context/realtime-context';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/Skeleton';

export const Header: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const path = e.currentTarget.getAttribute('href');
    if (path === '/' && pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    setMobileOpen(false);
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Why Rentia', href: '/#why-rentia' },
    { label: 'Stories', href: '/#stories' },
    { label: 'For Owners', href: '/#owners' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-mist/70 bg-fog/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
<img src="/logo.png" alt="Rentia Logo" className="h-11 w-auto object-contain" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={handleNavClick}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-coal/70 transition-colors duration-200 hover:bg-brand-soft hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
          {user &&
            (user.role === 'owner' ? (
              <Link
                href="/dashboard"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3.5 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/become-owner"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3.5 py-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand hover:text-white"
              >
                Become an Owner
              </Link>
            ))}
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden items-center gap-2 md:flex">
          {isLoading ? (
            <Skeleton className="h-9 w-28 rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/app/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-mist bg-white text-slate-500 transition-colors hover:bg-brand-soft hover:text-brand"
                aria-label="Messages"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </Link>
              <NotificationBell />
              <div className="flex h-9 items-center gap-2 rounded-lg border border-mist bg-white px-3 text-xs text-coal/70">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                <span className="max-w-[10rem] truncate font-mono">{user.email}</span>
              </div>
              <button
                onClick={() => logout()}
                className="rounded-lg border border-mist bg-white px-3.5 py-2 text-sm font-medium text-coal/70 transition-colors duration-200 hover:border-brand/30 hover:text-brand"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-coal/70 transition-colors duration-200 hover:bg-brand-soft hover:text-brand"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-[#0D9488] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
              >
                Sign Up Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-mist bg-white text-coal md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-mist/70 bg-fog md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={handleNavClick}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-coal/70 transition-colors hover:bg-brand-soft hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
            {user &&
              (user.role === 'owner' ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/become-owner"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand"
                >
                  Become an Owner
                </Link>
              ))}
            <div className="!mt-3 border-t border-mist/70 pt-3">
              {isLoading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : user ? (
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono text-xs text-coal/70">{user.email}</span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg border border-mist bg-white px-3.5 py-2 text-sm font-medium text-coal/70"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-mist bg-white px-4 py-2.5 text-center text-sm font-semibold text-coal"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-gradient-to-r from-brand to-[#0D9488] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-brand/25"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
