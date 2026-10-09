import { createClient, Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/db/schema';
import type { GeocodingResult } from '@/lib/mapbox';

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

export const db = tursoClient ? drizzle(tursoClient, { schema }) : null;

export async function searchAddressesInTurso(query: string): Promise<GeocodingResult[]> {
  if (!tursoClient) {
    console.warn('Turso client not configured; returning empty results');
    return [];
  }

  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const sql = `
    SELECT id, street_number, street_name, suburb, latitude, longitude
    FROM auckland_addresses
    WHERE lower(street_name) LIKE ? OR lower(suburb) LIKE ?
    LIMIT 6;
  `;
  const likePattern = `%${clean}%`;
  try {
    const result = await tursoClient.execute({ sql, args: [likePattern, likePattern] });
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
ensureIndexes();
