import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export const metadata: Metadata = {
  title: 'Kiwi Commuter | Auckland Driving vs AT Transit Arbitrage',
  description: 'Data-driven cost arbitrage comparing Auckland personal vehicle commute costs against Auckland Transport (AT) HOP fares.',
  openGraph: {
    title: 'Kiwi Commuter Cost & Arbitrage Dashboard',
    description:
      'Compare daily driving expenses (Fuel + NZTA RUC + Central Parking) against Auckland Public Transport ($50 7-Day Cap) to calculate net monthly financial arbitrage.',
    type: 'website',
    locale: 'en_NZ',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kiwi Commuter Cost & Arbitrage Dashboard',
    description:
      'Auckland Driving Costs (Fuel + NZTA RUC + CBD Parking) vs. AT HOP $50 7-Day Cap.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
        <Analytics/>
      </body>
    </html>
  );
}
