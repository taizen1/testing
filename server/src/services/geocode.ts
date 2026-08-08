import { config } from '../config.js';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export class GeocodeError extends Error {}

/** Geocodes a free-text address via the Google Geocoding API. */
export async function geocodeAddress(address: string): Promise<GeoPoint> {
  if (!config.googleMapsApiKey) {
    throw new GeocodeError('GOOGLE_MAPS_API_KEY is not configured on the server.');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', config.googleMapsApiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new GeocodeError(`Geocoding request failed with HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results: { geometry: { location: GeoPoint } }[];
  };

  if (data.status !== 'OK' || data.results.length === 0) {
    throw new GeocodeError(
      `Could not geocode "${address}": ${data.error_message ?? data.status}`
    );
  }

  return data.results[0].geometry.location;
}
