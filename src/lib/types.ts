// Polymarket Gamma API types

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarket[];
}

export interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string; // JSON string: "[0.62, 0.38]"
  volume: string;
  liquidity: string;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
}

export interface PricePoint {
  t: number; // Unix timestamp (seconds)
  p: number; // Probability [0, 1]
}

// Internal chart data point (merged market + expert)
export interface ChartDataPoint {
  timestamp: number;
  date: string; // Formatted date label
  market: number; // Market crowd probability
  expert: number; // Superforecaster probability
}

// Brier score result
export interface BrierResult {
  marketScore: number;
  expertScore: number;
  sampleSize: number;
}

// Event summary for the selector dropdown
export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  volume: string;
  currentPrice: number;
  active: boolean;
}

// News item for the impact feed
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  impact: "positive" | "negative" | "neutral";
  summary: string;
}
