import Link from 'next/link';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      {/* Left: brand visual */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ocean lg:block">
        <div className="lp-dots absolute inset-0 opacity-30" aria-hidden="true"></div>
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" aria-hidden="true"></div>
        <div className="pointer-events-none absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-mint/15 blur-3xl" aria-hidden="true"></div>

        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/logo.png" alt="Rentia Logo" className="h-16 w-auto object-contain" />
          </Link>

          <div>
            <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">
              Trust-driven rental platform.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              Fixed 30-day blocks. Transparent pricing. Direct owner payouts. No hidden fees.
            </p>

            <div className="mt-10 flex items-center gap-6">
              {[
                { value: '2,400+', label: 'Properties' },
                { value: '0%', label: 'Hidden Fees' },
                { value: '3 Days', label: 'Payout Hold' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-xl font-bold text-mint">{stat.value}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Rentia. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right: form area */}
      <div className="flex flex-1 flex-col bg-fog">
        {/* Mobile brand */}
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/logo.png" alt="Rentia Logo" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
