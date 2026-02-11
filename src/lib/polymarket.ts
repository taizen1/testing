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

  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single event by ID.
 */
export async function fetchEvent(id: string): Promise<PolymarketEvent> {
  const params = new URLSearchParams({ path: `/events/${id}` });
  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch price history for a market via the CLOB API.
 * Endpoint: clob.polymarket.com/prices-history?market={clobTokenId}
 */
export async function fetchPriceHistory(
  clobTokenId: string,
  fidelity = 720,
): Promise<PricePoint[]> {
  const params = new URLSearchParams({
    path: "/prices-history",
    market: clobTokenId,
    interval: "max",
    fidelity: String(fidelity),
  });

  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  return (data.history ?? data) as PricePoint[];
}

/**
 * Transform raw events into lightweight summaries for the selector.
 */
export function toEventSummaries(
  events: PolymarketEvent[],
): EventSummary[] {
  return events.map((event) => {
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
 * clobTokenIds is a JSON-encoded array whose elements are very large integers
 * (76+ digits) that exceed Number.MAX_SAFE_INTEGER.  Using JSON.parse would
 * silently corrupt them, so we extract the raw digit strings with a regex.
 */
export function extractClobTokenId(event: PolymarketEvent): string | null {
  const market = event.markets[0];
  if (!market?.clobTokenIds) return null;

  const matches = market.clobTokenIds.match(/\d{10,}/g);
  return matches?.[0] ?? null;
}
