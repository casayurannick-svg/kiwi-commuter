// Turso (libSQL) client utilities for address search fallback
import { createClient, Client } from '@libsql/client';
import type { GeocodingResult } from '@/lib/mapbox';

// Initialize Turso client using env variables. Ensure both URL and auth token are present.
const tursoUrl = process.env.TURSO_DATABASE_URL ?? '';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN ?? '';

let tursoClient: Client | null = null;
if (tursoUrl && tursoAuthToken) {
  try {
    tursoClient = createClient({ url: tursoUrl, authToken: tursoAuthToken });
  } catch (e) {
    console.warn('Failed to initialize Turso client:', e);
  }
}

/**
 * Simple full‑text like search against the Auckland addresses table.
 * The table is expected to have columns: id, street_number, street_name, suburb, city,
 * postcode, latitude, longitude, etc. Indexes on street_name and suburb should be created
 * in the database for performance (sub‑millisecond response for typical queries).
 */
export async function searchAddressesInTurso(query: string): Promise<GeocodingResult[]> {
  if (!tursoClient) {
    console.warn('Turso client not configured; returning empty results');
    return [];
  }

  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  // Use parameterised query to avoid SQL injection.
  const sql = `
    SELECT id, street_number, street_name, suburb, latitude, longitude
    FROM auckland_addresses
    WHERE lower(street_name) LIKE ? OR lower(suburb) LIKE ?
    LIMIT 6;
  `;
  const likePattern = `%${clean}%`;
  try {
    const result = await tursoClient.execute({ sql, args: [likePattern, likePattern] });
    // Map rows to GeocodingResult shape expected by UI.
    const rows = result.rows as unknown as Array<{
      id: number;
      street_number: string;
      street_name: string;
      suburb: string;
      latitude: number;
      longitude: number;
    }>;
    return rows.map((row) => ({
      id: `turso-${row.id}`,
      placeName: `${row.street_number} ${row.street_name}, ${row.suburb}`,
      text: `${row.street_number} ${row.street_name}`,
      coordinates: [row.longitude, row.latitude],
      suburbName: row.suburb,
    }));
  } catch (e) {
    console.warn('Turso address search failed:', e);
    return [];
  }
}

export { tursoClient };

/**
 * Helper to ensure appropriate indexes exist. This runs at import time for dev convenience.
 * In production you would use migration files; here we attempt a CREATE INDEX IF NOT EXISTS.
 */
async function ensureIndexes() {
  if (!tursoClient) return;
  const indexSql = [
    `CREATE INDEX IF NOT EXISTS idx_auckland_addresses_street_name ON auckland_addresses(lower(street_name));`,
    `CREATE INDEX IF NOT EXISTS idx_auckland_addresses_suburb ON auckland_addresses(lower(suburb));`,
  ];
  for (const stmt of indexSql) {
    try {
      await tursoClient.execute({ sql: stmt, args: [] });
    } catch {
      // ignore errors during index creation
    }
  }
}
// Fire-and-forget index creation (best‑effort).
ensureIndexes();
