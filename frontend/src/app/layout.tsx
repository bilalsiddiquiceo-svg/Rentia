import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components/Toast';
import { RealtimeProvider } from '@/context/realtime-context';

const cinzel = localFont({
  src: './fonts/cinzel-latin.woff2',
  display: 'swap',
  variable: '--font-heading',
});

const josefin = localFont({
  src: './fonts/josefin-sans-latin.woff2',
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Rentia — Trust-Driven Property Rental Platform',
  description: 'Direct rental platform for properties. Fixed 30-day blocks, transparent pricing, and secure owner payouts. No hidden fees.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${josefin.variable}`}>
      <body className="min-h-screen bg-paper text-ink flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
