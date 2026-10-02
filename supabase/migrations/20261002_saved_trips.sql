-- ==============================================================================
-- Supabase Migration: 20261002_saved_trips.sql
-- Project: Kiwi Commuter Cost & Arbitrage Dashboard
-- Description: Saved trips table for opaque, privacy-preserving shareable links (STORY-10)
-- ==============================================================================

-- 1. Saved trips table for opaque URLs
CREATE TABLE IF NOT EXISTS saved_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy lookup and temporal maintenance
CREATE INDEX IF NOT EXISTS idx_saved_trips_created_at ON saved_trips (created_at DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public read access
CREATE POLICY "Allow public read access to saved trips"
  ON saved_trips
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Policy: Public insert access for generating share links
CREATE POLICY "Allow public insert to saved trips"
  ON saved_trips
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
