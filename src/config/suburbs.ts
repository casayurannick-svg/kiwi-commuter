import { Suburb, SuburbCentroid } from '@/types';

/**
 * Top Auckland Suburb Coordinates & Centroids
 * Strictly typed definitions for commuter centroids across Greater Auckland.
 */
export const SUBURB_CENTROIDS: SuburbCentroid[] = [
  // Auckland Central
  {
    id: 'cbd',
    name: 'Auckland CBD',
    region: 'Auckland Central',
    coordinates: [174.7645, -36.8485],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 0.0,
  },
  {
    id: 'newmarket',
    name: 'Newmarket',
    region: 'Auckland Central',
    coordinates: [174.7770, -36.8687],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 4.2,
  },
  {
    id: 'ponsonby',
    name: 'Ponsonby',
    region: 'Auckland Central',
    coordinates: [174.7438, -36.8540],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 2.5,
  },
  {
    id: 'grey-lynn',
    name: 'Grey Lynn',
    region: 'Auckland Central',
    coordinates: [174.7335, -36.8601],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 3.8,
  },
  {
    id: 'mt-eden',
    name: 'Mount Eden',
    region: 'Auckland Central',
    coordinates: [174.7523, -36.8790],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 4.8,
  },
  {
    id: 'parnell',
    name: 'Parnell',
    region: 'Auckland Central',
    coordinates: [174.7797, -36.8550],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 2.1,
  },
  {
    id: 'grafton',
    name: 'Grafton',
    region: 'Auckland Central',
    coordinates: [174.7647, -36.8617],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 2.3,
  },
  {
    id: 'kingsland',
    name: 'Kingsland',
    region: 'Auckland Central',
    coordinates: [174.7431, -36.8715],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 4.6,
  },
  {
    id: 'mt-albert',
    name: 'Mount Albert',
    region: 'Auckland Central',
    coordinates: [174.7188, -36.8837],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 7.2,
  },
  {
    id: 'greenlane',
    name: 'Greenlane',
    region: 'Auckland Central',
    coordinates: [174.7938, -36.8920],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 6.8,
  },
  {
    id: 'remuera',
    name: 'Remuera',
    region: 'Auckland Central',
    coordinates: [174.8051, -36.8795],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 6.1,
  },
  {
    id: 'orakei',
    name: 'Orakei',
    region: 'Auckland Central',
    coordinates: [174.8143, -36.8622],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 5.4,
  },
  {
    id: 'mission-bay',
    name: 'Mission Bay',
    region: 'Auckland Central',
    coordinates: [174.8329, -36.8587],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 7.8,
  },
  {
    id: 'pt-chevalier',
    name: 'Point Chevalier',
    region: 'Auckland Central',
    coordinates: [174.7088, -36.8637],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 6.5,
  },
  {
    id: 'epsom',
    name: 'Epsom',
    region: 'Auckland Central',
    coordinates: [174.7672, -36.8860],
    defaultZonesToCBD: 1,
    approxDistanceKmToCBD: 5.2,
  },
  {
    id: 'mt-roskill',
    name: 'Mount Roskill',
    region: 'Auckland Central',
    coordinates: [174.7305, -36.9080],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 9.3,
  },
  {
    id: 'onehunga',
    name: 'Onehunga',
    region: 'Auckland Central',
    coordinates: [174.7865, -36.9242],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 10.4,
  },
  {
    id: 'ellerslie',
    name: 'Ellerslie',
    region: 'Auckland Central',
    coordinates: [174.8080, -36.8994],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 8.6,
  },
  {
    id: 'penrose',
    name: 'Penrose',
    region: 'Auckland Central',
    coordinates: [174.8197, -36.9135],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 10.1,
  },
  {
    id: 'sylvia-park',
    name: 'Sylvia Park (Mt Wellington)',
    region: 'Auckland Central',
    coordinates: [174.8420, -36.9150],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 12.9,
  },

  // North Shore
  {
    id: 'takapuna',
    name: 'Takapuna',
    region: 'North Shore',
    coordinates: [174.7733, -36.7876],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 9.1,
  },
  {
    id: 'devonport',
    name: 'Devonport',
    region: 'North Shore',
    coordinates: [174.7960, -36.8315],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 15.2,
  },
  {
    id: 'northcote',
    name: 'Northcote',
    region: 'North Shore',
    coordinates: [174.7478, -36.8042],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 7.5,
  },
  {
    id: 'birkenhead',
    name: 'Birkenhead',
    region: 'North Shore',
    coordinates: [174.7262, -36.8166],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 9.6,
  },
  {
    id: 'glenfield',
    name: 'Glenfield',
    region: 'North Shore',
    coordinates: [174.7175, -36.7842],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 13.5,
  },
  {
    id: 'milford',
    name: 'Milford',
    region: 'North Shore',
    coordinates: [174.7660, -36.7690],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 12.8,
  },
  {
    id: 'albany',
    name: 'Albany',
    region: 'North Shore',
    coordinates: [174.7040, -36.7320],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 19.5,
  },
  {
    id: 'browns-bay',
    name: 'Browns Bay',
    region: 'North Shore',
    coordinates: [174.7470, -36.7160],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 21.5,
  },
  {
    id: 'silverdale',
    name: 'Silverdale',
    region: 'North Shore',
    coordinates: [174.6720, -36.6210],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 32.5,
  },
  {
    id: 'orewa',
    name: 'Orewa',
    region: 'North Shore',
    coordinates: [174.6940, -36.5860],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 38.0,
  },
  {
    id: 'whangaparaoa',
    name: 'Whangaparaoa',
    region: 'North Shore',
    coordinates: [174.7610, -36.6340],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 42.0,
  },

  // West Auckland
  {
    id: 'new-lynn',
    name: 'New Lynn',
    region: 'West Auckland',
    coordinates: [174.6860, -36.9086],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 12.3,
  },
  {
    id: 'avondale',
    name: 'Avondale',
    region: 'West Auckland',
    coordinates: [174.6975, -36.8970],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 10.2,
  },
  {
    id: 'henderson',
    name: 'Henderson',
    region: 'West Auckland',
    coordinates: [174.6320, -36.8810],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 16.8,
  },
  {
    id: 'te-atatu',
    name: 'Te Atatu Peninsula',
    region: 'West Auckland',
    coordinates: [174.6540, -36.8400],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 14.5,
  },
  {
    id: 'glen-eden',
    name: 'Glen Eden',
    region: 'West Auckland',
    coordinates: [174.6540, -36.9090],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 15.8,
  },
  {
    id: 'westgate',
    name: 'Westgate (Massey)',
    region: 'West Auckland',
    coordinates: [174.6150, -36.8180],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 18.5,
  },
  {
    id: 'massey',
    name: 'Massey East',
    region: 'West Auckland',
    coordinates: [174.6290, -36.8370],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 17.2,
  },
  {
    id: 'hobsonville',
    name: 'Hobsonville Point',
    region: 'West Auckland',
    coordinates: [174.6590, -36.7920],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 21.0,
  },
  {
    id: 'kumeu',
    name: 'Kumeu / Huapai',
    region: 'West Auckland',
    coordinates: [174.5570, -36.7750],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 28.5,
  },

  // East Auckland
  {
    id: 'st-heliers',
    name: 'St Heliers',
    region: 'East Auckland',
    coordinates: [174.8550, -36.8580],
    defaultZonesToCBD: 2,
    approxDistanceKmToCBD: 10.8,
  },
  {
    id: 'panmure',
    name: 'Panmure',
    region: 'East Auckland',
    coordinates: [174.8505, -36.8980],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 12.1,
  },
  {
    id: 'pakuranga',
    name: 'Pakuranga',
    region: 'East Auckland',
    coordinates: [174.8870, -36.9030],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 15.2,
  },
  {
    id: 'howick',
    name: 'Howick',
    region: 'East Auckland',
    coordinates: [174.9310, -36.8960],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 21.0,
  },
  {
    id: 'botany-downs',
    name: 'Botany Downs',
    region: 'East Auckland',
    coordinates: [174.9120, -36.9320],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 21.8,
  },
  {
    id: 'half-moon-bay',
    name: 'Half Moon Bay',
    region: 'East Auckland',
    coordinates: [174.9030, -36.8770],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 19.8,
  },

  // South Auckland
  {
    id: 'otahuhu',
    name: 'Otahuhu',
    region: 'South Auckland',
    coordinates: [174.8425, -36.9440],
    defaultZonesToCBD: 3,
    approxDistanceKmToCBD: 15.6,
  },
  {
    id: 'mangere',
    name: 'Mangere',
    region: 'South Auckland',
    coordinates: [174.7980, -36.9650],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 17.8,
  },
  {
    id: 'manukau',
    name: 'Manukau Central',
    region: 'South Auckland',
    coordinates: [174.8810, -36.9920],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 23.4,
  },
  {
    id: 'papatoetoe',
    name: 'Papatoetoe',
    region: 'South Auckland',
    coordinates: [174.8560, -36.9740],
    defaultZonesToCBD: 4,
    approxDistanceKmToCBD: 20.2,
  },
  {
    id: 'papakura',
    name: 'Papakura',
    region: 'South Auckland',
    coordinates: [174.9450, -37.0650],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 32.0,
  },
  {
    id: 'drury',
    name: 'Drury',
    region: 'South Auckland',
    coordinates: [174.9530, -37.1030],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 36.5,
  },
  {
    id: 'takanini',
    name: 'Takanini',
    region: 'South Auckland',
    coordinates: [174.9220, -37.0370],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 28.2,
  },
  {
    id: 'pukekohe',
    name: 'Pukekohe',
    region: 'South Auckland',
    coordinates: [174.9080, -37.2010],
    defaultZonesToCBD: 5,
    approxDistanceKmToCBD: 51.0,
  },
];

// Transit metadata map for enhanced route calculation
const TRANSIT_METADATA: Record<
  string,
  {
    drivingTimePeakMins: number;
    drivingTimeOffPeakMins: number;
    primaryTransitMode: 'Bus' | 'Train' | 'Northern Busway' | 'Ferry';
    transitTimeToCbdMins: number;
    transitRouteNotes: string;
  }
> = {
  cbd: {
    drivingTimePeakMins: 5,
    drivingTimeOffPeakMins: 5,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 5,
    transitRouteNotes: 'CityLink, InnerLink, Britomart Transport Centre hub',
  },
  newmarket: {
    drivingTimePeakMins: 22,
    drivingTimeOffPeakMins: 10,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 10,
    transitRouteNotes: 'Southern/Western/Onehunga lines direct to Britomart',
  },
  ponsonby: {
    drivingTimePeakMins: 18,
    drivingTimeOffPeakMins: 8,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 12,
    transitRouteNotes: 'InnerLink & frequent route 82/86 direct into Queen St',
  },
  'grey-lynn': {
    drivingTimePeakMins: 24,
    drivingTimeOffPeakMins: 12,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 16,
    transitRouteNotes: 'OuterLink & Richmond Rd bus corridor',
  },
  'mt-eden': {
    drivingTimePeakMins: 28,
    drivingTimeOffPeakMins: 14,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 18,
    transitRouteNotes: 'Frequent 27W/27H Mt Eden Rd corridor & future CRL Maungawhau',
  },
  parnell: {
    drivingTimePeakMins: 15,
    drivingTimeOffPeakMins: 6,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 7,
    transitRouteNotes: 'Parnell Train Station & InnerLink along Parnell Rd',
  },
  grafton: {
    drivingTimePeakMins: 16,
    drivingTimeOffPeakMins: 8,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 8,
    transitRouteNotes: 'Grafton Train Station & Park Rd hospital bus corridor',
  },
  kingsland: {
    drivingTimePeakMins: 25,
    drivingTimeOffPeakMins: 12,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 12,
    transitRouteNotes: 'Western Train Line direct to Britomart',
  },
  'mt-albert': {
    drivingTimePeakMins: 35,
    drivingTimeOffPeakMins: 18,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 18,
    transitRouteNotes: 'Western Train Line & New North Rd frequent bus',
  },
  greenlane: {
    drivingTimePeakMins: 32,
    drivingTimeOffPeakMins: 15,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 14,
    transitRouteNotes: 'Southern Line Greenlane Station & Great South Rd bus',
  },
  remuera: {
    drivingTimePeakMins: 30,
    drivingTimeOffPeakMins: 15,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 13,
    transitRouteNotes: 'Remuera Train Station & 75 frequent bus corridor',
  },
  orakei: {
    drivingTimePeakMins: 25,
    drivingTimeOffPeakMins: 12,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 8,
    transitRouteNotes: 'Eastern Train Line (1 stop to Britomart) & Tamaki Link',
  },
  'mission-bay': {
    drivingTimePeakMins: 32,
    drivingTimeOffPeakMins: 16,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 22,
    transitRouteNotes: 'Tamaki Link along scenic Tamaki Drive direct to Britomart',
  },
  'pt-chevalier': {
    drivingTimePeakMins: 30,
    drivingTimeOffPeakMins: 14,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 22,
    transitRouteNotes: 'Frequent bus 66 & OuterLink on Pt Chevalier Rd',
  },
  epsom: {
    drivingTimePeakMins: 26,
    drivingTimeOffPeakMins: 14,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 19,
    transitRouteNotes: 'Manukau Rd frequent bus corridor direct to Civic',
  },
  'mt-roskill': {
    drivingTimePeakMins: 38,
    drivingTimeOffPeakMins: 18,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 28,
    transitRouteNotes: 'Dominion Rd 25B/25L bus rapid corridor',
  },
  onehunga: {
    drivingTimePeakMins: 40,
    drivingTimeOffPeakMins: 20,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 24,
    transitRouteNotes: 'Onehunga Line Train direct to Newmarket & Britomart',
  },
  ellerslie: {
    drivingTimePeakMins: 34,
    drivingTimeOffPeakMins: 16,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 17,
    transitRouteNotes: 'Southern Line Ellerslie Train Station',
  },
  penrose: {
    drivingTimePeakMins: 38,
    drivingTimeOffPeakMins: 18,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 19,
    transitRouteNotes: 'Penrose junction station (Southern & Onehunga lines)',
  },
  'sylvia-park': {
    drivingTimePeakMins: 46,
    drivingTimeOffPeakMins: 20,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 20,
    transitRouteNotes: 'Sylvia Park Train Station (Eastern Line direct to Britomart)',
  },
  takapuna: {
    drivingTimePeakMins: 35,
    drivingTimeOffPeakMins: 15,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 18,
    transitRouteNotes: 'Akoranga Busway Station (NX1/NX2) & route 82',
  },
  devonport: {
    drivingTimePeakMins: 45,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Ferry',
    transitTimeToCbdMins: 12,
    transitRouteNotes: 'Devonport Ferry direct to Downtown Ferry Terminal (under $50 cap!)',
  },
  northcote: {
    drivingTimePeakMins: 30,
    drivingTimeOffPeakMins: 12,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 15,
    transitRouteNotes: 'Smales Farm / Akoranga Busway & 923 via Onewa Rd',
  },
  birkenhead: {
    drivingTimePeakMins: 38,
    drivingTimeOffPeakMins: 16,
    primaryTransitMode: 'Ferry',
    transitTimeToCbdMins: 14,
    transitRouteNotes: 'Birkenhead Wharf Ferry or Onewa T3 transit lane bus',
  },
  glenfield: {
    drivingTimePeakMins: 46,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 32,
    transitRouteNotes: 'Frequent bus 917 to Smales Farm Busway / 95B to City',
  },
  milford: {
    drivingTimePeakMins: 42,
    drivingTimeOffPeakMins: 20,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 26,
    transitRouteNotes: 'Feeder bus to Smales Farm Station then NX1 to CBD',
  },
  albany: {
    drivingTimePeakMins: 58,
    drivingTimeOffPeakMins: 24,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 28,
    transitRouteNotes: 'Albany Busway Station (NX1 rapid dedicated busway direct to CBD)',
  },
  'browns-bay': {
    drivingTimePeakMins: 60,
    drivingTimeOffPeakMins: 26,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 38,
    transitRouteNotes: 'Route 83/856 to Albany Busway Station + NX1 to CBD',
  },
  silverdale: {
    drivingTimePeakMins: 75,
    drivingTimeOffPeakMins: 34,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 45,
    transitRouteNotes: 'Hibiscus Coast Busway Station (NX1 express direct to Britomart)',
  },
  orewa: {
    drivingTimePeakMins: 85,
    drivingTimeOffPeakMins: 40,
    primaryTransitMode: 'Northern Busway',
    transitTimeToCbdMins: 55,
    transitRouteNotes: 'Route 981 connecting to Hibiscus Coast Busway NX1',
  },
  whangaparaoa: {
    drivingTimePeakMins: 90,
    drivingTimeOffPeakMins: 45,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 65,
    transitRouteNotes: 'Route 982/983 to Hibiscus Coast busway interchange',
  },
  'new-lynn': {
    drivingTimePeakMins: 45,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 25,
    transitRouteNotes: 'New Lynn Transport Interchange & Western Train line',
  },
  avondale: {
    drivingTimePeakMins: 40,
    drivingTimeOffPeakMins: 20,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 21,
    transitRouteNotes: 'Avondale Station Western Line & Rosebank Rd bus',
  },
  henderson: {
    drivingTimePeakMins: 55,
    drivingTimeOffPeakMins: 25,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 38,
    transitRouteNotes: 'Henderson Rail Interchange (Western Line direct to Britomart)',
  },
  'te-atatu': {
    drivingTimePeakMins: 48,
    drivingTimeOffPeakMins: 20,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 30,
    transitRouteNotes: 'Route 132/133 via SH16 Northwestern Busway priority',
  },
  'glen-eden': {
    drivingTimePeakMins: 52,
    drivingTimeOffPeakMins: 26,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 32,
    transitRouteNotes: 'Glen Eden Train Station Western Line',
  },
  westgate: {
    drivingTimePeakMins: 56,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 34,
    transitRouteNotes: 'WX1 Western Express via Northwestern motorway busway',
  },
  massey: {
    drivingTimePeakMins: 52,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 36,
    transitRouteNotes: 'WX1 / route 11 bus into CBD',
  },
  hobsonville: {
    drivingTimePeakMins: 62,
    drivingTimeOffPeakMins: 25,
    primaryTransitMode: 'Ferry',
    transitTimeToCbdMins: 35,
    transitRouteNotes: 'Hobsonville Point Ferry to Downtown Ferry Terminal (under $50 cap!)',
  },
  kumeu: {
    drivingTimePeakMins: 72,
    drivingTimeOffPeakMins: 32,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 55,
    transitRouteNotes: 'Route 126/129 connecting to WX1 Western Express at Westgate',
  },
  'st-heliers': {
    drivingTimePeakMins: 42,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 32,
    transitRouteNotes: 'Tamaki Link coastal route via Kohimarama and Mission Bay',
  },
  panmure: {
    drivingTimePeakMins: 44,
    drivingTimeOffPeakMins: 22,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 18,
    transitRouteNotes: 'Panmure Rail/AMETI Busway Interchange (Eastern Line)',
  },
  pakuranga: {
    drivingTimePeakMins: 54,
    drivingTimeOffPeakMins: 24,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 30,
    transitRouteNotes: 'Eastern Busway priority route 70 via Panmure rail connection',
  },
  howick: {
    drivingTimePeakMins: 62,
    drivingTimeOffPeakMins: 32,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 45,
    transitRouteNotes: 'Route 70 / 72X express or Half Moon Bay ferry connection',
  },
  'botany-downs': {
    drivingTimePeakMins: 65,
    drivingTimeOffPeakMins: 30,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 45,
    transitRouteNotes: 'Route 70 frequent bus via Panmure rail connection',
  },
  'half-moon-bay': {
    drivingTimePeakMins: 58,
    drivingTimeOffPeakMins: 28,
    primaryTransitMode: 'Ferry',
    transitTimeToCbdMins: 40,
    transitRouteNotes: 'Half Moon Bay Ferry directly to CBD Downtown terminal',
  },
  otahuhu: {
    drivingTimePeakMins: 52,
    drivingTimeOffPeakMins: 24,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 22,
    transitRouteNotes: 'Otahuhu Station Southern & Eastern line dual-connectivity',
  },
  mangere: {
    drivingTimePeakMins: 55,
    drivingTimeOffPeakMins: 24,
    primaryTransitMode: 'Bus',
    transitTimeToCbdMins: 42,
    transitRouteNotes: 'Airport Link 38 bus to Onehunga/Puhinui rail interchange',
  },
  manukau: {
    drivingTimePeakMins: 65,
    drivingTimeOffPeakMins: 28,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 38,
    transitRouteNotes: 'Manukau Rail Interchange (Eastern Line direct to Britomart)',
  },
  papatoetoe: {
    drivingTimePeakMins: 60,
    drivingTimeOffPeakMins: 26,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 32,
    transitRouteNotes: 'Papatoetoe Train Station (Southern Line express service)',
  },
  papakura: {
    drivingTimePeakMins: 80,
    drivingTimeOffPeakMins: 35,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 50,
    transitRouteNotes: 'Papakura Rail Terminus (Southern Line direct to Britomart)',
  },
  drury: {
    drivingTimePeakMins: 85,
    drivingTimeOffPeakMins: 38,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 58,
    transitRouteNotes: 'Feeder bus to Papakura Station Southern Line',
  },
  takanini: {
    drivingTimePeakMins: 72,
    drivingTimeOffPeakMins: 32,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 44,
    transitRouteNotes: 'Takanini Train Station (Southern Line)',
  },
  pukekohe: {
    drivingTimePeakMins: 95,
    drivingTimeOffPeakMins: 50,
    primaryTransitMode: 'Train',
    transitTimeToCbdMins: 68,
    transitRouteNotes: 'Pukekohe Rail electric shuttle connecting to Southern Line at Papakura',
  },
};

export const AUCKLAND_SUBURBS: Suburb[] = SUBURB_CENTROIDS.map((c) => {
  const meta = TRANSIT_METADATA[c.id] || {
    drivingTimePeakMins: Math.round(c.approxDistanceKmToCBD * 2.1 + 8),
    drivingTimeOffPeakMins: Math.round(c.approxDistanceKmToCBD * 1.0 + 5),
    primaryTransitMode: 'Bus' as const,
    transitTimeToCbdMins: Math.round(c.approxDistanceKmToCBD * 1.8 + 10),
    transitRouteNotes: 'Auckland Transport connecting service',
  };

  return {
    ...c,
    zone: c.defaultZonesToCBD as 1 | 2 | 3 | 4 | 5,
    drivingDistanceToCbdKm: c.approxDistanceKmToCBD,
    drivingTimePeakMins: meta.drivingTimePeakMins,
    drivingTimeOffPeakMins: meta.drivingTimeOffPeakMins,
    primaryTransitMode: meta.primaryTransitMode,
    transitTimeToCbdMins: meta.transitTimeToCbdMins,
    transitRouteNotes: meta.transitRouteNotes,
  };
});

export function getSuburbById(id: string): Suburb {
  const normalizedId = id === 'britomart_cbd' ? 'cbd' : id;
  const found = AUCKLAND_SUBURBS.find((s) => s.id === normalizedId || s.id === id);
  if (!found) {
    return AUCKLAND_SUBURBS[0];
  }
  return found;
}

export function getSuburbCentroidById(id: string): SuburbCentroid {
  const normalizedId = id === 'britomart_cbd' ? 'cbd' : id;
  const found = SUBURB_CENTROIDS.find((s) => s.id === normalizedId || s.id === id);
  if (!found) {
    return SUBURB_CENTROIDS[0];
  }
  return found;
}

// Great circle distance in km
export function haversineDistanceKm(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number]
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateRouteMetrics(
  origin: Suburb,
  destination: Suburb
): {
  distanceKm: number;
  drivingTimePeakMins: number;
  transitTimeMins: number;
  zonesTraveled: number;
} {
  if (origin.id === destination.id) {
    return {
      distanceKm: 2.0,
      drivingTimePeakMins: 8,
      transitTimeMins: 10,
      zonesTraveled: 1,
    };
  }

  // If destination is CBD, use precalculated values
  if (destination.id === 'cbd') {
    return {
      distanceKm: origin.drivingDistanceToCbdKm,
      drivingTimePeakMins: origin.drivingTimePeakMins,
      transitTimeMins: origin.transitTimeToCbdMins,
      zonesTraveled: origin.zone,
    };
  }

  // If origin is CBD, use destination values
  if (origin.id === 'cbd') {
    return {
      distanceKm: destination.drivingDistanceToCbdKm,
      drivingTimePeakMins: destination.drivingTimePeakMins,
      transitTimeMins: destination.transitTimeToCbdMins,
      zonesTraveled: destination.zone,
    };
  }

  // Suburb to Suburb
  const straightLine = haversineDistanceKm(origin.coordinates, destination.coordinates);
  const windingMultiplier = 1.34;
  const distanceKm = Math.round(straightLine * windingMultiplier * 10) / 10;
  const zonesTraveled = Math.min(5, Math.max(1, Math.abs(origin.zone - destination.zone) + 1));
  const drivingTimePeakMins = Math.round(distanceKm * 2.1 + 8);
  const transitTimeMins = Math.round(
    Math.min(origin.transitTimeToCbdMins + destination.transitTimeToCbdMins * 0.7, distanceKm * 2.3 + 15)
  );

  return {
    distanceKm,
    drivingTimePeakMins,
    transitTimeMins,
    zonesTraveled,
  };
}
