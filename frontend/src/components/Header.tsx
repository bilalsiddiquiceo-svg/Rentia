'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-mint text-sm font-extrabold text-white shadow-md shadow-brand/20 transition-transform duration-200 group-hover:scale-105">
            R
          </div>
          <span className="text-lg font-bold tracking-tight text-coal">Rentia</span>
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
            <div className="h-9 w-28 animate-pulse rounded-lg bg-mist"></div>
          ) : user ? (
            <div className="flex items-center gap-2">
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
                <div className="h-10 w-full animate-pulse rounded-lg bg-mist"></div>
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
