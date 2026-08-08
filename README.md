# Airport Travel Time — total-trip-time airport picker

Most flight search tools rank departure airports by flight price or flight
duration alone. This tool ranks them by **total door-to-door trip time**:

```
total trip time = (drive time to airport × 2) + recommended arrival buffer + flight time (incl. layovers)
```

Example from the original idea: a 10-hour flight out of YYZ with a 3-hour
drive adds 6 hours of driving to the trip (there and back). A itinerary from
ROC → BOS with the same 10-hour flight but only a 1-hour drive each way adds
just 2 hours. This app surfaces that comparison automatically across every
commercial airport within a configurable drive-time radius of your home
address.

## How it works

1. You enter your home address, a destination, and travel dates.
2. The backend geocodes your address (Google Geocoding API) and finds every
   candidate departure airport within your chosen drive-time radius, using a
   bundled seed dataset of major North American + international airports
   (`server/src/data/airports.json`).
3. It calls the **Google Distance Matrix API** to get real (traffic-aware)
   drive time to each candidate airport.
4. It calls **SerpApi's Google Flights engine** (`engine=google_flights`) —
   there is no public official "Google Flights API"; Google retired its old
   QPX Express API in 2018, and SerpApi's Google Flights engine is the
   closest thing to querying Google Flights' actual results programmatically
   — to get flight price/duration/stops from each candidate airport to your
   destination.
5. It ranks every airport by total trip time (and shows price alongside), so
   you can see the real trade-off instead of just comparing nonstop flight
   times.

## Project layout

```
server/   Express + TypeScript API (geocoding, drive time, flight search, ranking)
client/   React + Vite + TypeScript frontend
```

## Setup

### 1. API keys you'll need

- **Google Maps Platform** key with the **Geocoding API** and **Distance
  Matrix API** enabled: https://console.cloud.google.com/google/maps-apis
- **SerpApi** key (has a free trial tier): https://serpapi.com/

Copy `server/.env.example` to `server/.env` and fill in both keys.

### 2. Run the backend

```bash
cd server
npm install
npm run dev
```

Runs on http://localhost:4000 by default.

### 3. Run the frontend

```bash
cd client
npm install
npm run dev
```

Runs on http://localhost:5173 and proxies API calls to the backend.

## Notes / next steps

- The airport dataset in `server/src/data/airports.json` is a hand-curated
  seed list of major airports (accurate enough for radius filtering and
  drive-time lookups, but not exhaustive). For full coverage, swap it for
  the public domain [OurAirports](https://ourairports.com/data/) dataset
  filtered to `large_airport`/`medium_airport` types with scheduled service.
- The "arrival buffer" (time you should be at the airport before boarding)
  defaults to 2 hours domestic / 3 hours international and is
  configurable per-request — adjust to your own preference.
- Flight search currently picks the cheapest itinerary SerpApi returns for
  each origin airport. It's straightforward to extend the ranking to
  optimize for a weighted score of price + total time instead of total
  time alone.
