import Link from 'next/link';
import { Header } from '@/components/Header';

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-white/10 bg-coal text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top row */}
          <div className="flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:justify-between">
            {/* Brand + newsletter */}
            <div className="max-w-sm">
              <Link href="/" className="inline-flex items-center gap-2">
                <img src="/logo.png" alt="Rentia Logo" className="h-10 w-auto object-contain" />
              </Link>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Email for updates"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-brand/50"
                />
                <button className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-x-14 gap-y-6">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Platform</h3>
                <ul className="mt-3 space-y-2">
                  {[
                    { label: 'Browse', href: '/app' },
                    { label: 'For Owners', href: '/#owners' },
                    { label: 'How It Works', href: '/#how-it-works' },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/50 transition-colors hover:text-mint">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Company</h3>
                <ul className="mt-3 space-y-2">
                  {[
                    { label: 'About', href: '/' },
                    { label: 'Careers', href: '/' },
                    { label: 'Blog', href: '/' },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/50 transition-colors hover:text-mint">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Legal</h3>
                <ul className="mt-3 space-y-2">
                  {[
                    { label: 'Terms', href: '/' },
                    { label: 'Privacy', href: '/' },
                    { label: 'Cookies', href: '/' },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/50 transition-colors hover:text-mint">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 py-4 sm:flex-row">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} Rentia. All rights reserved.
            </p>
            <p className="text-xs text-white/30">Built with transparency in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
