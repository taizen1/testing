import airportsData from '../data/airports.json' with { type: 'json' };
import type { Airport } from '../types.js';
import { haversineMiles } from '../utils/haversine.js';

const AIRPORTS: Airport[] = airportsData as Airport[];

export function findAllAirports(): Airport[] {
  return AIRPORTS;
}

export function findAirportByIata(iata: string): Airport | undefined {
  return AIRPORTS.find((a) => a.iata.toUpperCase() === iata.toUpperCase());
}

/**
 * Airports within `radiusMiles` of a point, as a cheap straight-line pre-filter before
 * we spend a Distance Matrix call on them. Real roads are never shorter than straight-line
 * distance, so we pad generously (1.4x) rather than risk excluding a viable airport.
 */
export function findAirportsNear(
  point: { lat: number; lon: number },
  radiusMiles: number
): Airport[] {
  const straightLineRadius = radiusMiles * 1.4;
  return AIRPORTS.filter(
    (airport) => haversineMiles(point, airport) <= straightLineRadius
  );
}
