export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
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
  totalTripMinutes: number | null;
}

export interface RankResponse {
  homeAddress: string;
  homeLocation: { lat: number; lng: number };
  destination: string;
  options: AirportOption[];
  excluded: { airport: Airport; reason: string }[];
}

export interface RankRequest {
  homeAddress: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  maxDriveMinutes?: number;
  domesticBufferMinutes?: number;
  internationalBufferMinutes?: number;
  adults?: number;
}
