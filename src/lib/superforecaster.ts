import type { PricePoint, ChartDataPoint, BrierResult } from "./types";

// --- Tunable parameters ---
const SMOOTHING_BETA = 0.12; // Exponential smoothing factor (0.05–0.2)
const EXTREMIZE_K = 1.5; // Extremization growth rate

/**
 * Extremize a probability toward 0 or 1.
 * p_ext = p^α / (p^α + (1-p)^α)
 */
function extremize(p: number, alpha: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const pA = Math.pow(p, alpha);
  const qA = Math.pow(1 - p, alpha);
  return pA / (pA + qA);
}

/**
 * Compute time-varying alpha based on how far through the market we are.
 * α(t) = 1 + k * (days_elapsed / total_days)
 * Range: 1.0 (start) → 1 + k (end)
 */
function computeAlpha(
  timestamp: number,
  startTime: number,
  endTime: number,
): number {
  const totalDuration = endTime - startTime;
  if (totalDuration <= 0) return 1 + EXTREMIZE_K;
  const elapsed = Math.max(0, Math.min(timestamp - startTime, totalDuration));
  return 1 + EXTREMIZE_K * (elapsed / totalDuration);
}

/**
 * Generate the expert superforecaster line from raw market price history.
 *
 * Algorithm: Time-Decay Smoothing with Extremization (Option C)
 * 1. Exponential smoothing filters market noise
 * 2. Time-varying extremization corrects under-confidence
 */
export function generateExpertLine(
  priceHistory: PricePoint[],
  startTime: number,
  endTime: number,
): ChartDataPoint[] {
  if (priceHistory.length === 0) return [];

  const sorted = [...priceHistory].sort((a, b) => a.t - b.t);
  const result: ChartDataPoint[] = [];

  let smoothed = sorted[0].p;

  for (const point of sorted) {
    // Step 1: Exponential smoothing
    smoothed = SMOOTHING_BETA * point.p + (1 - SMOOTHING_BETA) * smoothed;

    // Step 2: Time-varying extremization
    const alpha = computeAlpha(point.t, startTime, endTime);
    const expert = extremize(smoothed, alpha);

    result.push({
      timestamp: point.t,
      date: formatTimestamp(point.t),
      market: Math.round(point.p * 1000) / 1000,
      expert: Math.round(expert * 1000) / 1000,
    });
  }

  return result;
}

/**
 * Compute Brier scores for both market and expert predictions.
 * Uses the final market price as a proxy for ground truth when
 * the market hasn't resolved yet.
 */
export function computeBrierScore(
  chartData: ChartDataPoint[],
  outcome?: number, // 0 or 1 if resolved
): BrierResult {
  if (chartData.length === 0) {
    return { marketScore: 0, expertScore: 0, sampleSize: 0 };
  }

  // If no outcome provided, use the latest market price as proxy
  const groundTruth = outcome ?? chartData[chartData.length - 1].market;

  let marketSum = 0;
  let expertSum = 0;

  for (const point of chartData) {
    marketSum += Math.pow(point.market - groundTruth, 2);
    expertSum += Math.pow(point.expert - groundTruth, 2);
  }

  return {
    marketScore: Math.round((marketSum / chartData.length) * 10000) / 10000,
    expertScore: Math.round((expertSum / chartData.length) * 10000) / 10000,
    sampleSize: chartData.length,
  };
}

function formatTimestamp(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
