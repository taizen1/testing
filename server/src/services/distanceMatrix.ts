import { config } from '../config.js';
import type { Airport } from '../types.js';
import type { GeoPoint } from './geocode.js';

export class DistanceMatrixError extends Error {}

export interface DriveResult {
  minutes: number;
  miles: number;
}

const MAX_DESTINATIONS_PER_REQUEST = 25;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Real, traffic-aware driving time from `origin` to each of `airports`, via the Google
 * Distance Matrix API. Returns a map keyed by IATA code; airports Google couldn't route to
 * (no driving route, invalid location, etc.) are simply omitted from the result.
 */
export async function getDriveTimes(
  origin: GeoPoint,
  airports: Airport[]
): Promise<Map<string, DriveResult>> {
  if (!config.googleMapsApiKey) {
    throw new DistanceMatrixError('GOOGLE_MAPS_API_KEY is not configured on the server.');
  }
  if (airports.length === 0) return new Map();

  const results = new Map<string, DriveResult>();

  for (const batch of chunk(airports, MAX_DESTINATIONS_PER_REQUEST)) {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
    url.searchParams.set(
      'destinations',
      batch.map((a) => `${a.lat},${a.lon}`).join('|')
    );
    url.searchParams.set('mode', 'driving');
    // Traffic-aware duration; "now" is the only value the API accepts besides a future epoch.
    url.searchParams.set('departure_time', 'now');
    url.searchParams.set('key', config.googleMapsApiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new DistanceMatrixError(`Distance Matrix request failed with HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      rows: {
        elements: {
          status: string;
          duration_in_traffic?: { value: number };
          duration?: { value: number };
          distance?: { value: number };
        }[];
      }[];
    };

    if (data.status !== 'OK') {
      throw new DistanceMatrixError(
        `Distance Matrix request failed: ${data.error_message ?? data.status}`
      );
    }

    const elements = data.rows[0]?.elements ?? [];
    elements.forEach((element, i) => {
      const airport = batch[i];
      if (element.status !== 'OK') return;
      const seconds = element.duration_in_traffic?.value ?? element.duration?.value;
      const meters = element.distance?.value;
      if (seconds === undefined || meters === undefined) return;
      results.set(airport.iata, {
        minutes: seconds / 60,
        miles: meters / 1609.344,
      });
    });
  }

  return results;
}
