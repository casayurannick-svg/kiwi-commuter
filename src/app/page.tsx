import DashboardClient from '@/components/DashboardClient';
import { getLatestBenchmarkSummary } from '@/lib/supabase';
import { Suspense } from 'react';

export const revalidate = 3600; // Cache page shell / data for 1 hour

/**
 * Kiwi Commuter Root Page (STORY-3)
 * Renders the responsive tabbed shell (Summary / Compare / Advanced) with URL deep-linking
 * and seamless client-side state preservation.
 */
export default async function Page() {
  const initialFuelPrices = await getLatestBenchmarkSummary();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center font-mono text-xs">
          Loading Kiwi Commuter...
        </div>
      }
    >
      <DashboardClient initialFuelPrices={initialFuelPrices} />
    </Suspense>
  );
}
