import { AT_HOP_7_DAY_CAP, AT_HOP_ZONE_FARES } from '@/config/fares.config';
import { getSuburbById } from '@/config/suburbs';
import { NextResponse } from 'next/server';

const AT_API_KEY = process.env.AT_API_SUBSCRIPTION_KEY || process.env.OCP_APIM_SUBSCRIPTION_KEY || '';
const AT_API_BASE = 'https://api.at.govt.nz';

// Curated transit corridors across Auckland
const AT_CORRIDORS = [
  {
    id: 'nx1',
    code: 'NX1',
    name: 'Northern Express 1',
    mode: 'Busway Rapid Transit',
    route: 'Hibiscus Coast / Albany Station ⇄ Akoranga ⇄ Britomart / Lower Albert St',
    frequencyMins: 5,
    hopCapEligible: true,
  },
  {
    id: 'nx2',
    code: 'NX2',
    name: 'Northern Express 2',
    mode: 'Busway Rapid Transit',
    route: 'Albany Station ⇄ Akoranga ⇄ Auckland University / Wellesley St',
    frequencyMins: 6,
    hopCapEligible: true,
  },
  {
    id: 'western-train',
    code: 'WEST',
    name: 'Western Line Train',
    mode: 'Electric Heavy Rail',
    route: 'Swanson ⇄ Henderson ⇄ New Lynn ⇄ Kingsland ⇄ Britomart',
    frequencyMins: 10,
    hopCapEligible: true,
  },
  {
    id: 'southern-train',
    code: 'STH',
    name: 'Southern Line Train',
    mode: 'Electric Heavy Rail',
    route: 'Papakura ⇄ Takanini ⇄ Manukau / Otahuhu ⇄ Newmarket ⇄ Britomart',
    frequencyMins: 10,
    hopCapEligible: true,
  },
  {
    id: 'eastern-train',
    code: 'EAST',
    name: 'Eastern Line Train',
    mode: 'Electric Heavy Rail',
    route: 'Manukau ⇄ Sylvia Park ⇄ Panmure ⇄ Orakei ⇄ Britomart',
    frequencyMins: 10,
    hopCapEligible: true,
  },
  {
    id: 'wx1',
    code: 'WX1',
    name: 'Western Express 1',
    mode: 'Motorway Rapid Transit',
    route: 'Westgate Interchange ⇄ Te Atatu ⇄ Britomart',
    frequencyMins: 10,
    hopCapEligible: true,
  },
  {
    id: 'devonport-ferry',
    code: 'DEV',
    name: 'Devonport Ferry',
    mode: 'Inner Harbour Ferry',
    route: 'Devonport Wharf ⇄ Downtown Ferry Terminal',
    frequencyMins: 15,
    hopCapEligible: true, // Included under the AT $50 7-day cap
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const originId = searchParams.get('origin') || 'albany';
  const destinationId = searchParams.get('destination') || 'cbd';

  const origin = getSuburbById(originId);
  const destination = getSuburbById(destinationId);

  let atLiveStatus = 'cache_fallback';
  let liveRoutes: unknown[] = [];

  if (AT_API_KEY) {
    try {
      const response = await fetch(`${AT_API_BASE}/gtfs/v2/routes`, {
        headers: {
          'Ocp-Apim-Subscription-Key': AT_API_KEY,
        },
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const json = await response.json();
        liveRoutes = json.response?.slice(0, 15) || [];
        atLiveStatus = 'live_api_connected';
      }
    } catch (e: unknown) {
      console.warn('AT Developer API call failed, falling back to local timetable cache:', e);
    }
  }

  return NextResponse.json({
    success: true,
    atLiveStatus,
    corridors: AT_CORRIDORS,
    hopPolicy: {
      sevenDayCap: AT_HOP_7_DAY_CAP,
      description: 'Any AT HOP passenger travels with unlimited bus, train, and inner ferry rides once $50 is spent in any 7-day rolling window.',
      zoneFares: AT_HOP_ZONE_FARES,
    },
    suggestedCorridor: {
      origin: origin.name,
      destination: destination.name,
      primaryMode: origin.primaryTransitMode,
      transitTimeToCbdMins: origin.transitTimeToCbdMins,
      notes: origin.transitRouteNotes,
    },
    liveRoutes: liveRoutes.length > 0 ? liveRoutes : undefined,
  });
}
