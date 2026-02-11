"use client";

import { useState, useEffect, useCallback } from "react";
import Chart from "@/components/Chart";
import EventSelector from "@/components/EventSelector";
import BrierCard from "@/components/BrierCard";
import MarketInfo from "@/components/MarketInfo";
import NewsFeed from "@/components/NewsFeed";
import {
  fetchEvents,
  fetchEvent,
  fetchPriceHistory,
  toEventSummaries,
  extractClobTokenId,
} from "@/lib/polymarket";
import { generateExpertLine, computeBrierScore } from "@/lib/superforecaster";
import type {
  EventSummary,
  PolymarketEvent,
  ChartDataPoint,
  BrierResult,
} from "@/lib/types";

export default function Home() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selected, setSelected] = useState<EventSummary | null>(null);
  const [eventDetail, setEventDetail] = useState<PolymarketEvent | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [brierResult, setBrierResult] = useState<BrierResult | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents(30)
      .then((data) => setEvents(toEventSummaries(data)))
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoadingEvents(false));
  }, []);

  // When user selects an event, fetch its detail + price history
  const handleSelectEvent = useCallback(async (event: EventSummary) => {
    setSelected(event);
    setLoadingChart(true);
    setChartData([]);
    setBrierResult(null);

    try {
      const detail = await fetchEvent(event.id);
      setEventDetail(detail);

      const tokenId = extractClobTokenId(detail);
      if (!tokenId) {
        console.error("No CLOB token ID found");
        setLoadingChart(false);
        return;
      }

      const history = await fetchPriceHistory(tokenId);

      const startTime = detail.startDate
        ? Math.floor(new Date(detail.startDate).getTime() / 1000)
        : history[0]?.t ?? 0;
      const endTime = detail.endDate
        ? Math.floor(new Date(detail.endDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const data = generateExpertLine(history, startTime, endTime);
      setChartData(data);

      const brier = computeBrierScore(data);
      setBrierResult(brier);
    } catch (err) {
      console.error("Failed to load event data:", err);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          Compare market crowd sentiment against expert superforecaster
          predictions.
        </p>
      </section>

      {/* Main grid — chart left, sidebar right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart area (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            {/* Event selector */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="shrink-0">
                <h2 className="text-sm font-medium text-white/80">
                  Event Tracker
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Select a Polymarket event to begin analysis
                </p>
              </div>
              <div className="w-64">
                <EventSelector
                  events={events}
                  selected={selected}
                  onSelect={handleSelectEvent}
                  loading={loadingEvents}
                />
              </div>
            </div>

            {/* Chart */}
            <Chart data={chartData} loading={loadingChart} />

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sage-400" />
                <span className="text-white/50">Market Crowd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-periwinkle-400" />
                <span className="text-white/50">Superforecaster</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — stats + info (1/3 width) */}
        <div className="space-y-6">
          <BrierCard result={brierResult} />
          <MarketInfo event={eventDetail} />

          {/* Expert methodology card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Expert Method
            </h3>
            <p className="mt-2 text-[11px] text-white/25 leading-relaxed">
              Time-Decay Smoothing with Extremization. Exponential smoothing
              (β=0.12) filters market noise, then time-varying extremization
              pushes predictions toward 0/1 as the event approaches resolution.
            </p>
          </div>
        </div>
      </div>

      {/* News feed section (below chart) */}
      <section>
        <NewsFeed items={[]} />
      </section>
    </div>
  );
}
