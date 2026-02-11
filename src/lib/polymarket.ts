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
 * Fetch price history for a market via the Gamma API.
 * Endpoint: /markets/{marketId}/prices/history
 */
export async function fetchPriceHistory(
  marketId: string,
): Promise<PricePoint[]> {
  const params = new URLSearchParams({
    path: `/markets/${marketId}/prices/history`,
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
 * Extract the first market ID from an event (for price history).
 */
export function extractMarketId(event: PolymarketEvent): string | null {
  return event.markets[0]?.id ?? null;
}
