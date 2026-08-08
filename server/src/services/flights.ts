import { config } from '../config.js';
import type { FlightOption } from '../types.js';
import { TtlCache } from '../utils/cache.js';

export class FlightSearchError extends Error {}

interface SerpApiFlightLeg {
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  airline: string;
}

interface SerpApiFlightGroup {
  flights: SerpApiFlightLeg[];
  total_duration: number; // minutes
  price?: number;
}

interface SerpApiGoogleFlightsResponse {
  error?: string;
  search_metadata?: { status: string };
  best_flights?: SerpApiFlightGroup[];
  other_flights?: SerpApiFlightGroup[];
}

export interface FlightSearchParams {
  departureIata: string;
  arrivalIdOrQuery: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currency?: string;
}

// SerpApi Google Flights results don't change minute to minute — cache for a few
// minutes so ranking one trip across many candidate airports doesn't refetch on retries,
// and so repeated searches for the same route/date within a session are near-instant.
const cache = new TtlCache<FlightOption | null>(5 * 60 * 1000);

function cacheKey(p: FlightSearchParams): string {
  return [
    p.departureIata,
    p.arrivalIdOrQuery,
    p.departureDate,
    p.returnDate ?? 'oneway',
    p.adults,
    p.currency ?? 'USD',
  ].join('|');
}

function pickCheapest(groups: SerpApiFlightGroup[] | undefined): SerpApiFlightGroup | undefined {
  if (!groups || groups.length === 0) return undefined;
  return groups
    .filter((g) => typeof g.price === 'number')
    .sort((a, b) => (a.price as number) - (b.price as number))[0];
}

function toFlightOption(group: SerpApiFlightGroup, currency: string): FlightOption {
  const legs = group.flights;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const airlines = Array.from(new Set(legs.map((l) => l.airline)));

  return {
    price: group.price ?? NaN,
    currency,
    durationMinutes: group.total_duration,
    stops: legs.length - 1,
    airlines,
    departureTime: first.departure_airport.time,
    arrivalTime: last.arrival_airport.time,
  };
}

/**
 * Searches Google Flights results (via SerpApi's `google_flights` engine — Google has no
 * public flight-search API of its own) for one route/date and returns the cheapest
 * itinerary found, or null if nothing was returned for that airport/date combination.
 */
export async function searchCheapestFlight(
  params: FlightSearchParams
): Promise<FlightOption | null> {
  if (!config.serpApiKey) {
    throw new FlightSearchError('SERPAPI_KEY is not configured on the server.');
  }

  return cache.getOrSet(cacheKey(params), async () => {
    const currency = params.currency ?? 'USD';
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_flights');
    url.searchParams.set('departure_id', params.departureIata);
    url.searchParams.set('arrival_id', params.arrivalIdOrQuery);
    url.searchParams.set('outbound_date', params.departureDate);
    url.searchParams.set('type', params.returnDate ? '1' : '2'); // 1=round trip, 2=one-way
    if (params.returnDate) url.searchParams.set('return_date', params.returnDate);
    url.searchParams.set('adults', String(params.adults));
    url.searchParams.set('currency', currency);
    url.searchParams.set('hl', 'en');
    url.searchParams.set('api_key', config.serpApiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new FlightSearchError(
        `Flight search for ${params.departureIata} failed with HTTP ${res.status}`
      );
    }
    const data = (await res.json()) as SerpApiGoogleFlightsResponse;

    if (data.error) {
      // SerpApi returns a 200 with an `error` field for "no flights found" type cases —
      // treat that as "no flight available from this airport", not a hard failure.
      return null;
    }

    const cheapest = pickCheapest(data.best_flights) ?? pickCheapest(data.other_flights);
    if (!cheapest) return null;

    return toFlightOption(cheapest, currency);
  });
}
