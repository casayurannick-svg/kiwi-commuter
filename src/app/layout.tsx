import type { Metadata } from 'next';
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
