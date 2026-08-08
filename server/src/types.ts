export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface RankRequestBody {
  /** Home address to geocode and measure drive time from. */
  homeAddress: string;
  /** Destination airport IATA code or city name for the flight search (SerpApi arrival_id / query). */
  destination: string;
  /** Outbound date, YYYY-MM-DD. */
  departureDate: string;
  /** Optional return date, YYYY-MM-DD. Omit for a one-way search. */
  returnDate?: string;
  /** Max one-way drive time (minutes) to consider a departure airport. Default 240. */
  maxDriveMinutes?: number;
  /** Minutes to arrive before boarding for a domestic flight. Default 120. */
  domesticBufferMinutes?: number;
  /** Minutes to arrive before boarding for an international flight. Default 180. */
  internationalBufferMinutes?: number;
  /** Number of adult passengers. Default 1. */
  adults?: number;
}

export interface FlightOption {
  price: number;
  currency: string;
  durationMinutes: number;
  stops: number;
  airlines: string[];
  departureTime: string;
  arrivalTime: string;
}

export interface AirportOption {
  airport: Airport;
  driveMinutesEachWay: number;
  driveDistanceMiles: number;
  isInternational: boolean;
  flight: FlightOption | null;
  flightError?: string;
  /** (driveMinutesEachWay * 2) + arrivalBuffer + flight.durationMinutes */
  totalTripMinutes: number | null;
}

export interface RankResponse {
  homeAddress: string;
  homeLocation: { lat: number; lng: number };
  destination: string;
  options: AirportOption[];
  /** Airports that were within range but every downstream lookup failed. */
  excluded: { airport: Airport; reason: string }[];
}
