import DashboardClient from '@/components/DashboardClient';
import { getLatestBenchmarkSummary } from '@/lib/supabase';

export const revalidate = 3600; // Cache page shell / data for 1 hour

export default async function Page() {
  const initialFuelPrices = await getLatestBenchmarkSummary();

  return <DashboardClient initialFuelPrices={initialFuelPrices} />;
}
