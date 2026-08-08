import { Router } from 'express';
import type { AirportOption, RankRequestBody, RankResponse } from '../types.js';
import { findAirportByIata, findAirportsNear } from '../services/airports.js';
import { geocodeAddress, GeocodeError } from '../services/geocode.js';
import { getDriveTimes, DistanceMatrixError } from '../services/distanceMatrix.js';
import { searchCheapestFlight, FlightSearchError } from '../services/flights.js';
import { mapWithConcurrency } from '../utils/cache.js';

export const rankRouter = Router();

const DEFAULT_MAX_DRIVE_MINUTES = 240;
const DEFAULT_DOMESTIC_BUFFER_MINUTES = 120;
const DEFAULT_INTERNATIONAL_BUFFER_MINUTES = 180;
const FLIGHT_SEARCH_CONCURRENCY = 4;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(res: import('express').Response, message: string) {
  return res.status(400).json({ error: message });
}

rankRouter.post('/rank', async (req, res) => {
  const body = req.body as Partial<RankRequestBody>;

  if (!body.homeAddress?.trim()) return badRequest(res, '"homeAddress" is required.');
  if (!body.destination?.trim()) return badRequest(res, '"destination" is required.');
  if (!body.departureDate || !DATE_PATTERN.test(body.departureDate)) {
    return badRequest(res, '"departureDate" is required in YYYY-MM-DD format.');
  }
  if (body.returnDate && !DATE_PATTERN.test(body.returnDate)) {
    return badRequest(res, '"returnDate" must be in YYYY-MM-DD format.');
  }

  const maxDriveMinutes = body.maxDriveMinutes ?? DEFAULT_MAX_DRIVE_MINUTES;
  const domesticBufferMinutes = body.domesticBufferMinutes ?? DEFAULT_DOMESTIC_BUFFER_MINUTES;
  const internationalBufferMinutes =
    body.internationalBufferMinutes ?? DEFAULT_INTERNATIONAL_BUFFER_MINUTES;
  const adults = body.adults && body.adults > 0 ? body.adults : 1;

  // Straight-line-radius miles corresponding to the drive-minutes budget, assuming a
  // generous average speed — findAirportsNear pads this further before the real
  // Distance Matrix call narrows it down to actual drive time.
  const assumedAvgSpeedMph = 55;
  const radiusMiles = (maxDriveMinutes / 60) * assumedAvgSpeedMph;

  try {
    const homeLocation = await geocodeAddress(body.homeAddress);
    const candidates = findAirportsNear(
      { lat: homeLocation.lat, lon: homeLocation.lng },
      radiusMiles
    );

    if (candidates.length === 0) {
      const response: RankResponse = {
        homeAddress: body.homeAddress,
        homeLocation,
        destination: body.destination,
        options: [],
        excluded: [],
      };
      return res.json(response);
    }

    const driveTimes = await getDriveTimes(homeLocation, candidates);

    const withinRange = candidates.filter((airport) => {
      const drive = driveTimes.get(airport.iata);
      return drive !== undefined && drive.minutes <= maxDriveMinutes;
    });

    const excluded: RankResponse['excluded'] = candidates
      .filter((a) => !withinRange.includes(a))
      .map((airport) => ({
        airport,
        reason: driveTimes.has(airport.iata)
          ? `Drive time exceeds the ${maxDriveMinutes}-minute limit.`
          : 'Google could not compute a driving route to this airport.',
      }));

    const destinationAirport = findAirportByIata(body.destination.trim());

    const options: AirportOption[] = await mapWithConcurrency(
      withinRange,
      FLIGHT_SEARCH_CONCURRENCY,
      async (airport): Promise<AirportOption> => {
        const drive = driveTimes.get(airport.iata)!;
        // If we can't resolve the destination to a known airport/country, default to the
        // (larger) international buffer rather than risk under-estimating trip time.
        const isInternational = destinationAirport
          ? destinationAirport.country !== airport.country
          : true;

        try {
          const flight = await searchCheapestFlight({
            departureIata: airport.iata,
            arrivalIdOrQuery: body.destination!.trim(),
            departureDate: body.departureDate!,
            returnDate: body.returnDate,
            adults,
          });

          const buffer = isInternational ? internationalBufferMinutes : domesticBufferMinutes;
          const totalTripMinutes = flight
            ? drive.minutes * 2 + buffer + flight.durationMinutes
            : null;

          return {
            airport,
            driveMinutesEachWay: Math.round(drive.minutes),
            driveDistanceMiles: Math.round(drive.miles),
            isInternational,
            flight,
            flightError: flight ? undefined : 'No flights found for this airport/date.',
            totalTripMinutes: totalTripMinutes === null ? null : Math.round(totalTripMinutes),
          };
        } catch (err) {
          return {
            airport,
            driveMinutesEachWay: Math.round(drive.minutes),
            driveDistanceMiles: Math.round(drive.miles),
            isInternational,
            flight: null,
            flightError: err instanceof Error ? err.message : 'Flight search failed.',
            totalTripMinutes: null,
          };
        }
      }
    );

    options.sort((a, b) => {
      if (a.totalTripMinutes === null) return 1;
      if (b.totalTripMinutes === null) return -1;
      return a.totalTripMinutes - b.totalTripMinutes;
    });

    const response: RankResponse = {
      homeAddress: body.homeAddress,
      homeLocation,
      destination: body.destination,
      options,
      excluded,
    };
    return res.json(response);
  } catch (err) {
    if (err instanceof GeocodeError) return badRequest(res, err.message);
    if (err instanceof DistanceMatrixError || err instanceof FlightSearchError) {
      return res.status(502).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});
