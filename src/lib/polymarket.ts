import type {
  PolymarketEvent,
  PricePoint,
  EventSummary,
} from "./types";

// All requests go through our Next.js API route to avoid CORS
const PROXY = "/api/polymarket";

/**
 * Fetch active events from Polymarket Gamma API (via proxy).
 */
export async function fetchEvents(
  limit = 20,
  active = true,
): Promise<PolymarketEvent[]> {
  const params = new URLSearchParams({
    path: "/events",
    limit: String(limit),
    active: String(active),
    closed: "false",
    order: "volume",
    ascending: "false",
  });

  const url = `${PROXY}?${params}`;
  console.log("[polymarket] fetchEvents →", url);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[polymarket] fetchEvents failed:", res.status, body.slice(0, 200));
    throw new Error(`Failed to fetch events (${res.status})`);
  }

  const data = await res.json();

  // Gamma returns a bare JSON array
  if (!Array.isArray(data)) {
    console.error("[polymarket] fetchEvents: expected array, got:", typeof data, data);
    throw new Error("Unexpected response format from Gamma API");
  }

  console.log(`[polymarket] fetchEvents ✓ got ${data.length} events`);
  return data;
}

/**
 * Fetch a single event by ID.
 */
export async function fetchEvent(id: string): Promise<PolymarketEvent> {
  const params = new URLSearchParams({ path: `/events/${id}` });
  const url = `${PROXY}?${params}`;
  console.log("[polymarket] fetchEvent →", url);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[polymarket] fetchEvent failed:", res.status, body.slice(0, 200));
    throw new Error(`Failed to fetch event ${id} (${res.status})`);
  }

  const data = await res.json();
  console.log("[polymarket] fetchEvent ✓", data?.title ?? "(no title)");
  return data;
}

/**
 * Fetch price history for a market via the CLOB API.
 * Endpoint: clob.polymarket.com/prices-history?market={clobTokenId}
 *
 * Tries fidelity 720 (12h) first, then 1440 (24h) as fallback.
 */
export async function fetchPriceHistory(
  clobTokenId: string,
): Promise<PricePoint[]> {
  // Try multiple fidelity levels — resolved markets may only return data at coarse resolution
  const fidelities = [720, 1440];

  for (const fidelity of fidelities) {
    const params = new URLSearchParams({
      path: "/prices-history",
      market: clobTokenId,
      interval: "max",
      fidelity: String(fidelity),
    });

    const url = `${PROXY}?${params}`;
    console.log(`[polymarket] fetchPriceHistory → fidelity=${fidelity}`, url);

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[polymarket] fetchPriceHistory ${res.status}:`, body.slice(0, 200));
      // Don't throw yet — try next fidelity
      continue;
    }

    const data = await res.json();

    // CLOB returns { history: [{ t, p }, ...] }
    const history: PricePoint[] = data?.history ?? (Array.isArray(data) ? data : []);
    console.log(`[polymarket] fetchPriceHistory ✓ fidelity=${fidelity}, ${history.length} points`);

    if (history.length > 0) {
      return history;
    }

    // Empty history at this fidelity — try the next one
    console.log(`[polymarket] fetchPriceHistory: empty at fidelity=${fidelity}, trying next...`);
  }

  // All fidelities returned empty — return empty (caller handles this)
  console.warn("[polymarket] fetchPriceHistory: no data at any fidelity for token", clobTokenId);
  return [];
}

/**
 * Transform raw events into lightweight summaries for the selector.
 */
export function toEventSummaries(
  events: PolymarketEvent[],
): EventSummary[] {
  return events
    .filter((event) => event.markets && event.markets.length > 0)
    .map((event) => {
      const market = event.markets[0];
      let currentPrice = 0.5;
      if (market?.outcomePrices) {
        try {
          const prices = JSON.parse(market.outcomePrices) as number[];
          currentPrice = prices[0] ?? 0.5;
        } catch {
          // malformed JSON — fall back to 0.5
        }
      }

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        volume: market?.volume ?? "0",
        currentPrice,
        active: event.active,
      };
    });
}

/**
 * Extract the first CLOB token ID from an event (for price history).
 *
 * clobTokenIds is a JSON-encoded array of strings, e.g.:
 *   '["4623155377...590", "1086321910...961"]'
 *
 * The strings are already quoted in the JSON, so JSON.parse returns
 * string[] (no precision loss). We try JSON.parse first, then fall
 * back to regex extraction as a safety net.
 */
export function extractClobTokenId(event: PolymarketEvent): string | null {
  const market = event.markets?.[0];
  if (!market?.clobTokenIds) {
    console.warn("[polymarket] extractClobTokenId: no clobTokenIds on first market");
    return null;
  }

  const raw = market.clobTokenIds;
  console.log("[polymarket] extractClobTokenId raw:", raw.slice(0, 80) + (raw.length > 80 ? "..." : ""));

  // Approach 1: JSON.parse — token IDs are strings in the JSON, so no precision loss
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      console.log("[polymarket] extractClobTokenId ✓ via JSON.parse:", parsed[0].slice(0, 30) + "...");
      return parsed[0];
    }
  } catch {
    // fallthrough to regex
  }

  // Approach 2: Regex — extract first long digit sequence
  const matches = raw.match(/\d{10,}/g);
  if (matches?.[0]) {
    console.log("[polymarket] extractClobTokenId ✓ via regex:", matches[0].slice(0, 30) + "...");
    return matches[0];
  }

  console.warn("[polymarket] extractClobTokenId: could not extract token ID from:", raw.slice(0, 100));
  return null;
}
