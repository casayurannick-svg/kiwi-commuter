'use client';

import { fetchDrivingRoute } from '@/lib/mapbox';
import { Suburb } from '@/types';
import {
  Bus,
  Compass,
  Layers,
  Navigation,
  Train,
} from 'lucide-react';
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
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([
    origin.coordinates,
    destination.coordinates,
  ]);

  const rawToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const token = rawToken.trim().replace(/^["']|["']$/g, '').replace(/^ppk\./, 'pk.');

  // Fetch detailed route geometry from Mapbox or local Auckland corridor generator
  useEffect(() => {
    let isCancelled = false;
    const loadGeometry = async () => {
      try {
        const routeData = await fetchDrivingRoute(origin.coordinates, destination.coordinates);
        if (!isCancelled && routeData && routeData.coordinates.length > 0) {
          setRouteCoordinates(routeData.coordinates);
        }
      } catch (e) {
        console.warn('Failed to fetch detailed route coordinates:', e);
      }
    };

    loadGeometry();
    return () => {
      isCancelled = true;
    };
  }, [origin.coordinates, destination.coordinates]);

  // Mapbox GL initialization & dynamic updates
  useEffect(() => {
    if (!token || !token.startsWith('pk.')) {
      setMapboxError(true);
      return;
    }

    let mapInstance: mapboxgl.Map | null = null;

    const initMapbox = async () => {
      try {
        const mapboxglModule = await import('mapbox-gl');
        const mapboxgl = mapboxglModule.default;
        (mapboxgl as unknown as { accessToken: string }).accessToken = token;

        if (!mapContainerRef.current) return;

        const bounds: [number, number, number, number] = [
          Math.min(origin.coordinates[0], destination.coordinates[0]) - 0.04,
          Math.min(origin.coordinates[1], destination.coordinates[1]) - 0.04,
          Math.max(origin.coordinates[0], destination.coordinates[0]) + 0.04,
          Math.max(origin.coordinates[1], destination.coordinates[1]) + 0.04,
        ];

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          bounds: bounds,
          fitBoundsOptions: { padding: 45 },
          cooperativeGestures: true, // Prevent scroll trapping on mobile
        });

        mapInstance = map;

        map.on('load', () => {
          // Origin Marker (Emerald Green)
          new mapboxgl.Marker({ color: '#10b981' })
            .setLngLat(origin.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div style="color: #0f172a; padding: 4px;">
                  <strong style="font-size: 13px;">Origin: ${origin.name}</strong><br/>
                  <span style="font-size: 11px; color: #475569;">Zone ${origin.zone} • ${origin.region}</span><br/>
                  <span style="font-size: 11px; color: #059669;">PT: ${origin.primaryTransitMode}</span>
                </div>`
              )
            )
            .addTo(map);

          // Destination Marker (Sky Blue)
          new mapboxgl.Marker({ color: '#38bdf8' })
            .setLngLat(destination.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div style="color: #0f172a; padding: 4px;">
                  <strong style="font-size: 13px;">Destination: ${destination.name}</strong><br/>
                  <span style="font-size: 11px; color: #475569;">Zone ${destination.zone} • ${destination.region}</span>
                </div>`
              )
            )
            .addTo(map);

          // Route Source & Layer
          map.addSource('commute-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates,
              },
            },
          });

          // Glow outline
          map.addLayer({
            id: 'route-glow',
            type: 'line',
            source: 'commute-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': activeLayer === 'driving' ? '#0284c7' : '#059669',
              'line-width': 8,
              'line-opacity': 0.35,
            },
          });

          // Primary Route Line
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'commute-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': activeLayer === 'driving' ? '#38bdf8' : '#10b981',
              'line-width': activeLayer === 'driving' ? 4 : 4.5,
              'line-dasharray': activeLayer === 'transit' ? [2, 1.5] : [1, 0],
            },
          });
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
      } catch (err: unknown) {
        console.warn('Mapbox initialization failed:', err);
        setMapboxError(true);
      }
    };

    initMapbox();

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, [origin, destination, token, routeCoordinates, activeLayer]);

  // SVG-based interactive Auckland Geographic Visualizer
  const minLng = 174.55;
  const maxLng = 174.98;
  const minLat = -37.15;
  const maxLat = -36.6;

  const project = (lngLat: [number, number]): { x: number; y: number } => {
    const x = ((lngLat[0] - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lngLat[1]) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  const oProj = project(origin.coordinates);
  const dProj = project(destination.coordinates);

  const midX = (oProj.x + dProj.x) / 2 + (oProj.y > dProj.y ? 6 : -6);
  const midY = (oProj.y + dProj.y) / 2 + (oProj.x > dProj.x ? -6 : 6);
  const pathD = `M ${oProj.x} ${oProj.y} Q ${midX} ${midY} ${dProj.x} ${dProj.y}`;

  // Key transit lines for Auckland Isthmus reference
  const northernBuswayD = 'M 49 14 Q 51 28 53 38 Q 54 44 55 49';
  const southernLineD = 'M 55 49 Q 59 62 65 74 Q 69 82 74 90';
  const westernLineD = 'M 55 49 Q 47 52 38 56 Q 30 58 25 54';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-56 sm:h-64 md:h-[300px] lg:h-[320px] relative border border-slate-800 shadow-xl">
      {/* Header bar overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow pointer-events-auto">
          <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            {origin.name} → {destination.name}
          </span>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
            {distanceKm} km
          </span>
        </div>

        {/* Driving vs Transit View Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow pointer-events-auto">
          <button
            onClick={() => setActiveLayer('driving')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeLayer === 'driving'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🚗 Drive</span>
            <span className="font-mono text-[11px] opacity-90">({drivingTimeMins}m)</span>
          </button>
          <button
            onClick={() => setActiveLayer('transit')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeLayer === 'transit'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🚆 Transit</span>
            <span className="font-mono text-[11px] opacity-90">({transitTimeMins}m)</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      {!mapboxError && token.startsWith('pk.') ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        /* Auckland Vector Corridor Visualizer */
        <div className="w-full h-full relative bg-gradient-to-b from-[#090f1d] via-[#0f172a] to-[#1e293b] flex items-center justify-center p-4 select-none">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

          {/* Border grid context */}
          <div className="absolute inset-x-8 top-12 bottom-12 border border-slate-800/80 rounded-xl pointer-events-none opacity-40">
            <span className="absolute top-2 right-3 text-[10px] uppercase font-mono tracking-widest text-slate-500">
              Auckland Isthmus & Transit Corridors
            </span>
            <span className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-600">
              174.76° E / 36.85° S (NZDT)
            </span>
          </div>

          <svg className="w-full h-full max-w-lg max-h-[290px] relative z-1" viewBox="0 0 100 100">
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

            {/* Auckland Transit Backbone Overlay Lines (Northern Busway, Western, Southern) */}
            <path
              d={northernBuswayD}
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="1.5,1.5"
              opacity="0.5"
            />
            <path
              d={southernLineD}
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="1.5,1.5"
              opacity="0.5"
            />
            <path
              d={westernLineD}
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="1.5,1.5"
              opacity="0.5"
            />

            {/* Active Corridor Route Path */}
            <path
              d={pathD}
              fill="none"
              stroke={activeLayer === 'driving' ? 'url(#routeGradientDriving)' : 'url(#routeGradientTransit)'}
              strokeWidth={activeLayer === 'driving' ? '2.4' : '2.6'}
              strokeDasharray={activeLayer === 'transit' ? '3,1.5' : undefined}
              filter="url(#glow)"
              className="transition-all duration-500"
            />

            {/* Midpoint Corridor Indicator */}
            <circle cx={midX} cy={midY} r="1.4" fill="#f8fafc" opacity="0.8" />

            {/* Origin Node Pin */}
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

            {/* Destination Node Pin */}
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
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-xs">
        <div className="flex items-center gap-2">
          {origin.primaryTransitMode === 'Train' ? (
            <Train className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Bus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="text-slate-300 font-medium truncate">
            Transit: <strong className="text-emerald-400">{origin.primaryTransitMode}</strong>
            <span className="text-slate-500 font-normal"> ({origin.transitRouteNotes})</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1 text-slate-400">
            <Layers className="w-3 h-3 text-sky-400" />
            Layer: <span className="font-semibold text-white capitalize">{activeLayer}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-teal-400" />
            Zone {origin.zone} ➔ {destination.zone}
          </span>
        </div>
      </div>
    </div>
  );
}
