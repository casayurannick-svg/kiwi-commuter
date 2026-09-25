'use client';

import { Suburb } from '@/types';
import { Compass, MapPin, Navigation } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface RouteMapProps {
  origin: Suburb;
  destination: Suburb;
  distanceKm: number;
  drivingTimeMins: number;
  transitTimeMins: number;
}

export default function RouteMap({
  origin,
  destination,
  distanceKm,
  drivingTimeMins,
  transitTimeMins,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapboxError, setMapboxError] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'driving' | 'transit'>('driving');

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  useEffect(() => {
    // Check if valid token is provided
    if (!token || !token.startsWith('pk.')) {
      setMapboxError(true);
      return;
    }

    let mapInstance: mapboxgl.Map | null = null;

    const initMapbox = async () => {
      try {
        const mapboxglModule = await import('mapbox-gl');
        const mapboxgl = mapboxglModule.default;
        // Mapbox accessToken
        (mapboxgl as unknown as { accessToken: string }).accessToken = token;

        if (!mapContainerRef.current) return;

        const bounds: [number, number, number, number] = [
          Math.min(origin.coordinates[0], destination.coordinates[0]) - 0.05,
          Math.min(origin.coordinates[1], destination.coordinates[1]) - 0.05,
          Math.max(origin.coordinates[0], destination.coordinates[0]) + 0.05,
          Math.max(origin.coordinates[1], destination.coordinates[1]) + 0.05,
        ];

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          bounds: bounds,
          fitBoundsOptions: { padding: 50 },
        });

        mapInstance = map;

        map.on('load', () => {
          // Add Origin Marker
          new mapboxgl.Marker({ color: '#10b981' })
            .setLngLat(origin.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(`<b>Origin: ${origin.name}</b><br>Zone ${origin.zone}`))
            .addTo(map);

          // Add Destination Marker
          new mapboxgl.Marker({ color: '#38bdf8' })
            .setLngLat(destination.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(`<b>Destination: ${destination.name}</b><br>Zone ${destination.zone}`))
            .addTo(map);

          // Add Route line
          const coordinates = [origin.coordinates, destination.coordinates];
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates,
              },
            },
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#0ea5e9',
              'line-width': 4,
              'line-dasharray': [1, 1],
            },
          });
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      } catch (err: unknown) {
        console.warn('Mapbox initialization failed:', err);
        setMapboxError(true);
      }
    };

    initMapbox();

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, [origin, destination, token]);

  // SVG-based interactive fallback representing Auckland geography
  const minLng = 174.55;
  const maxLng = 174.98;
  const minLat = -37.15;
  const maxLat = -36.6;

  const project = (lngLat: [number, number]): { x: number; y: number } => {
    const x = ((lngLat[0] - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lngLat[1]) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
    };
  };

  const oProj = project(origin.coordinates);
  const dProj = project(destination.coordinates);

  const midX = (oProj.x + dProj.x) / 2 + (oProj.y > dProj.y ? 6 : -6);
  const midY = (oProj.y + dProj.y) / 2 + (oProj.x > dProj.x ? -6 : 6);
  const pathD = `M ${oProj.x} ${oProj.y} Q ${midX} ${midY} ${dProj.x} ${dProj.y}`;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[380px] sm:h-[440px] relative border border-slate-700/60 shadow-xl">
      {/* Header bar overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow pointer-events-auto">
          <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            {origin.name} → {destination.name}
          </span>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
            {distanceKm} km
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow pointer-events-auto">
          <button
            onClick={() => setActiveLayer('driving')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              activeLayer === 'driving'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚗 Drive ({drivingTimeMins}m)
          </button>
          <button
            onClick={() => setActiveLayer('transit')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              activeLayer === 'transit'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚆 Transit ({transitTimeMins}m)
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      {!mapboxError && token.startsWith('pk.') ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        /* Auckland Vector Corridor Visualizer */
        <div className="w-full h-full relative bg-gradient-to-b from-[#0b1329] via-[#0f172a] to-[#1e293b] flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

          <div className="absolute inset-x-8 top-12 bottom-12 border border-slate-800/80 rounded-xl pointer-events-none opacity-40">
            <span className="absolute top-2 right-3 text-[10px] uppercase font-mono tracking-widest text-slate-500">
              Auckland Isthmus & Hauraki Gulf
            </span>
            <span className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-600">
              174.76° E / 36.85° S (NZDT)
            </span>
          </div>

          <svg className="w-full h-full max-w-lg max-h-[360px] relative z-1" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="routeGradientDriving" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <linearGradient id="routeGradientTransit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <path
              d="M 50 15 Q 52 35 55 52 Q 62 70 70 88"
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="2,2"
              opacity="0.6"
            />

            <path
              d={pathD}
              fill="none"
              stroke={activeLayer === 'driving' ? 'url(#routeGradientDriving)' : 'url(#routeGradientTransit)'}
              strokeWidth="2.2"
              strokeDasharray={activeLayer === 'transit' ? '3,1.5' : undefined}
              filter="url(#glow)"
              className="transition-all duration-500"
            />

            <circle cx={midX} cy={midY} r="1.5" fill="#f8fafc" opacity="0.8" />

            <g transform={`translate(${oProj.x}, ${oProj.y})`}>
              <circle r="4" fill="#10b981" opacity="0.25" className="animate-ping" />
              <circle r="2.8" fill="#10b981" stroke="#ffffff" strokeWidth="0.8" />
              <text
                x="0"
                y="-4.5"
                textAnchor="middle"
                className="text-[3.2px] font-bold fill-emerald-300 select-none shadow-sm"
              >
                {origin.name} (Z{origin.zone})
              </text>
            </g>

            <g transform={`translate(${dProj.x}, ${dProj.y})`}>
              <circle r="4" fill="#38bdf8" opacity="0.25" className="animate-ping" />
              <circle r="2.8" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
              <text
                x="0"
                y="6.5"
                textAnchor="middle"
                className="text-[3.2px] font-bold fill-sky-300 select-none shadow-sm"
              >
                {destination.name} (Z{destination.zone})
              </text>
            </g>
          </svg>
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-medium">
            Primary PT: <span className="text-emerald-400 font-semibold">{origin.primaryTransitMode}</span>
          </span>
          <span className="text-slate-500 hidden sm:inline">• {origin.transitRouteNotes}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Compass className="w-3 h-3 text-slate-400" />
          <span>Auckland AT HOP Zone Matrix</span>
        </div>
      </div>
    </div>
  );
}
