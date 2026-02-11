"use client";

import type { PolymarketEvent } from "@/lib/types";

interface MarketInfoProps {
  event: PolymarketEvent | null;
}

function formatVolume(vol: string): string {
  const n = parseFloat(vol);
  if (isNaN(n)) return "--";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDate(iso: string): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentPrice(event: PolymarketEvent): string {
  const market = event.markets[0];
  if (!market?.outcomePrices) return "--";
  try {
    const prices = JSON.parse(market.outcomePrices) as number[];
    return `${(prices[0] * 100).toFixed(1)}%`;
  } catch {
    return "--";
  }
}

export default function MarketInfo({ event }: MarketInfoProps) {
  const market = event?.markets[0];

  const rows = [
    { label: "Volume", value: market ? formatVolume(market.volume) : "--" },
    { label: "Liquidity", value: market ? formatVolume(market.liquidity) : "--" },
    { label: "End Date", value: event ? formatDate(event.endDate) : "--" },
    { label: "Current Price", value: event ? getCurrentPrice(event) : "--" },
    {
      label: "Status",
      value: event
        ? event.closed
          ? "Closed"
          : event.active
            ? "Active"
            : "Inactive"
        : "--",
    },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
        Market Info
      </h3>
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-xs">
            <span className="text-white/35">{row.label}</span>
            <span className="text-white/60">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
