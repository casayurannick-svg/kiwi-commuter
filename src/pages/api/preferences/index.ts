import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/turso';
import { userPreferences } from '@/db/schema';
import { sql } from 'drizzle-orm';

export interface PreferencesRequestBody {
  sessionId?: string;
  daysInOffice?: number | null;
  dailyCoffeeCost?: number | null;
  dailyLunchCost?: number | null;
  dailyParkingCost?: number | null;
  hourlyWage?: number | null;
  primaryTransportMode?: string | null;
}

export interface PreferencesResponseData {
  success: boolean;
  preference?: typeof userPreferences.$inferSelect;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreferencesResponseData>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    sessionId,
    daysInOffice,
    dailyCoffeeCost,
    dailyLunchCost,
    dailyParkingCost,
    hourlyWage,
    primaryTransportMode,
  }: PreferencesRequestBody = req.body || {};

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  const cleanSessionId = sessionId.trim();

  if (!db) {
    return res.status(500).json({
      success: false,
      error: 'Database client is not configured',
    });
  }

  try {
    const valuesToInsert = {
      sessionId: cleanSessionId,
      daysInOffice: daysInOffice ?? null,
      dailyCoffeeCost: dailyCoffeeCost ?? null,
      dailyLunchCost: dailyLunchCost ?? null,
      dailyParkingCost: dailyParkingCost ?? null,
      hourlyWage: hourlyWage ?? null,
      primaryTransportMode: primaryTransportMode ?? null,
    };

    const [upserted] = await db
      .insert(userPreferences)
      .values(valuesToInsert)
      .onConflictDoUpdate({
        target: userPreferences.sessionId,
        set: {
          daysInOffice: valuesToInsert.daysInOffice,
          dailyCoffeeCost: valuesToInsert.dailyCoffeeCost,
          dailyLunchCost: valuesToInsert.dailyLunchCost,
          dailyParkingCost: valuesToInsert.dailyParkingCost,
          hourlyWage: valuesToInsert.hourlyWage,
          primaryTransportMode: valuesToInsert.primaryTransportMode,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return res.status(200).json({
      success: true,
      preference: upserted,
    });
  } catch (err: unknown) {
    console.error('Error upserting user preferences:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to upsert user preferences',
    });
  }
}
