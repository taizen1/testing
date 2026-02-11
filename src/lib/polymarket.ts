import type {
  PolymarketEvent,
  PricePoint,
  EventSummary,
} from "./types";

const GAMMA_API = "https://gamma-api.polymarket.com";

/**
 * Fetch active events from Polymarket Gamma API.
 */
export async function fetchEvents(
  limit = 20,
  active = true,
): Promise<PolymarketEvent[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    active: String(active),
    closed: "false",
    order: "volume",
    ascending: "false",
  });

  const res = await fetch(`${GAMMA_API}/events?${params}`);
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single event by ID.
 */
export async function fetchEvent(id: string): Promise<PolymarketEvent> {
  const res = await fetch(`${GAMMA_API}/events/${id}`);
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch price history for a specific market (CLOB token).
 */
export async function fetchPriceHistory(
  clobTokenId: string,
  fidelity = 60, // minutes between data points
): Promise<PricePoint[]> {
  const params = new URLSearchParams({
    market: clobTokenId,
    interval: "max",
    fidelity: String(fidelity),
  });

  const res = await fetch(
    `${GAMMA_API}/prices/history?${params}`,
  );
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);

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
 */
export function extractClobTokenId(event: PolymarketEvent): string | null {
  const market = event.markets[0];
  if (!market?.clobTokenIds) return null;
  try {
    const ids = JSON.parse(market.clobTokenIds) as string[];
    return ids[0] ?? null;
  } catch {
    return market.clobTokenIds;
  }
}
