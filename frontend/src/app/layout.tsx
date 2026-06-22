import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crypto Bank (Demo)',
  description: 'Simulated portfolio project — not a real bank',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="sticky top-0 z-[9999] bg-amber-400 text-slate-900 text-center px-4 py-2 text-sm font-bold leading-snug border-b-2 border-amber-600">
          DEMO &mdash; This is a simulated portfolio project, not a real bank. Balances are fake. Do NOT send real cryptocurrency or funds.
        </div>
        {children}
      </body>
    </html>
  );
}
