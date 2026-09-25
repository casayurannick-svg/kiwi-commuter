import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent iOS Safari accidental zoom on input focus
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export const metadata: Metadata = {
  title: 'Kiwi Commuter Cost & Arbitrage Dashboard | Auckland Fuel vs AT HOP Fares',
  description:
    'Compare daily driving expenses (Fuel + NZTA RUC + Central Auckland Parking) against Auckland Public Transport (AT HOP Zonal Fares & $50 7-Day Cap) to calculate net monthly financial arbitrage.',
  keywords: [
    'Auckland Transport',
    'AT HOP fare calculator',
    '$50 7-day cap',
    'NZ fuel prices',
    'NZTA RUC',
    'Auckland commuter arbitrage',
    'commute cost comparison NZ',
    'Auckland parking rates',
    'electric vehicle RUC calculator NZ',
  ],
  authors: [{ name: 'Kiwi Commuter Analytics' }],
  creator: 'Kiwi Commuter Team',
  publisher: 'Kiwi Commuter',
  openGraph: {
    title: 'Kiwi Commuter Cost & Arbitrage Dashboard',
    description:
      'Compare daily driving expenses (Fuel + NZTA RUC + Central Parking) against Auckland Public Transport ($50 7-Day Cap) to calculate net monthly financial arbitrage.',
    type: 'website',
    locale: 'en_NZ',
    siteName: 'Kiwi Commuter Arbitrage',
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#090d16] text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
