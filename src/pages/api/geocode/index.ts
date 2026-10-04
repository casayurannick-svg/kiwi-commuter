import type { NextApiRequest, NextApiResponse } from 'next';

export type GeocodeResponse =
  | {
      address: string;
      latitude: number;
      longitude: number;
    }
  | {
      results: [];
    };

export interface GeocodeErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse | GeocodeErrorResponse>
) {
  // 1. Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Extract and validate the 'q' parameter
  const { q } = req.query;
  const query = Array.isArray(q) ? q[0] : q;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const cleanQuery = query.trim();

  // 3. Try Mapbox first
  const apiKey = process.env.MAPBOX_API_KEY || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  let mapboxQueriedAndEmpty = false;

  if (apiKey) {
    try {
      const mapboxUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(cleanQuery)}&access_token=${apiKey}&country=nz`;
      const response = await fetch(mapboxUrl);

      if (response.ok) {
        const data = await response.json();
        const feature = data.features?.[0];

        if (feature) {
          const address =
            feature.properties?.full_address ||
            feature.properties?.name ||
            feature.properties?.place_formatted ||
            feature.place_name ||
            feature.text;
          const longitude =
            feature.geometry?.coordinates?.[0] ??
            feature.properties?.coordinates?.longitude ??
            feature.center?.[0];
          const latitude =
            feature.geometry?.coordinates?.[1] ??
            feature.properties?.coordinates?.latitude ??
            feature.center?.[1];

          if (address && typeof latitude === 'number' && typeof longitude === 'number') {
            return res.status(200).json({ address, latitude, longitude });
          }
        } else {
          mapboxQueriedAndEmpty = true;
        }
      }
    } catch (error) {
      console.warn('Mapbox geocoding failed, falling back to Nominatim:', error);
    }
  }

  // 4. Fallback to Nominatim if Mapbox fails
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1&countrycodes=nz`;
    const nomResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'NZTransportCostDashboard/1.0',
        'Accept': 'application/json',
      },
    });

    if (nomResponse.ok) {
      const nomData = await nomResponse.json();
      const first = Array.isArray(nomData) ? nomData[0] : null;

      if (first && first.lat && first.lon) {
        const latitude = parseFloat(first.lat);
        const longitude = parseFloat(first.lon);

        if (!isNaN(latitude) && !isNaN(longitude)) {
          return res.status(200).json({
            address: first.display_name || first.name || cleanQuery,
            latitude,
            longitude,
          });
        }
      }

      return res.status(200).json({ results: [] });
    }

    if (nomResponse.status === 404 || mapboxQueriedAndEmpty) {
      return res.status(200).json({ results: [] });
    }

    return res.status(nomResponse.status || 502).json({ error: 'Nominatim geocoding service error' });
  } catch (error) {
    if (mapboxQueriedAndEmpty) {
      return res.status(200).json({ results: [] });
    }
    console.error('Nominatim geocoding fallback error:', error);
    return res.status(500).json({ error: 'Internal server error during geocoding' });
  }
}
