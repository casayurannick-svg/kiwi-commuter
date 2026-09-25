-- ==============================================================================
-- Supabase Migration: 20260925_init_schema.sql
-- Project: Kiwi Commuter Cost & Arbitrage Dashboard
-- Description: MBIE Fuel benchmarks table, indexing, and Row Level Security (RLS)
-- ==============================================================================

-- 1. Fuel price snapshots table
CREATE TABLE IF NOT EXISTS fuel_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending_date DATE NOT NULL UNIQUE,
  regular_91 NUMERIC(6, 2) NOT NULL, -- Retail price in cents/L (e.g. 272.00)
  premium_95 NUMERIC(6, 2) NOT NULL, -- Retail price in cents/L (e.g. 294.00)
  diesel NUMERIC(6, 2) NOT NULL,     -- Retail price in cents/L (e.g. 205.00)
  is_provisional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy lookup of the latest price
CREATE INDEX IF NOT EXISTS idx_fuel_benchmarks_date ON fuel_benchmarks (week_ending_date DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE fuel_benchmarks ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public read access
CREATE POLICY "Allow public read access to fuel benchmarks"
  ON fuel_benchmarks
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Policy: Service role upsert access
CREATE POLICY "Allow service role full access to fuel benchmarks"
  ON fuel_benchmarks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
