"use client";

import { useState, useEffect, useCallback } from "react";
import Chart from "@/components/Chart";
import EventSelector from "@/components/EventSelector";
import BrierCard from "@/components/BrierCard";
import MarketInfo from "@/components/MarketInfo";
import NewsFeed from "@/components/NewsFeed";
import ErrorCard from "@/components/ErrorCard";
import {
  fetchEvents,
  fetchEvent,
  fetchPriceHistory,
  toEventSummaries,
  extractClobTokenId,
} from "@/lib/polymarket";
import { generateExpertLine, computeBrierScore } from "@/lib/superforecaster";
import { generateMockNews } from "@/lib/news";
import type {
  EventSummary,
  PolymarketEvent,
  ChartDataPoint,
  BrierResult,
  NewsItem,
} from "@/lib/types";

export default function Home() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selected, setSelected] = useState<EventSummary | null>(null);
  const [eventDetail, setEventDetail] = useState<PolymarketEvent | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [brierResult, setBrierResult] = useState<BrierResult | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch events on mount
  const loadEvents = useCallback(() => {
    setLoadingEvents(true);
    setError(null);
    fetchEvents(30)
      .then((data) => setEvents(toEventSummaries(data)))
      .catch((err) => {
        console.error("Failed to fetch events:", err);
        setError("Could not load events from Polymarket. Check your connection and try again.");
      })
      .finally(() => setLoadingEvents(false));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // When user selects an event, fetch its detail + price history
  const handleSelectEvent = useCallback(async (event: EventSummary) => {
    setSelected(event);
    setLoadingChart(true);
    setChartData([]);
    setBrierResult(null);
    setNewsItems([]);
    setError(null);

    try {
      const detail = await fetchEvent(event.id);
      setEventDetail(detail);

      const tokenId = extractClobTokenId(detail);
      if (!tokenId) {
        setError("This event has no price data available.");
        setLoadingChart(false);
        return;
      }

      const history = await fetchPriceHistory(tokenId);

      if (!history || history.length === 0) {
        setError("No price history found for this event.");
        setLoadingChart(false);
        return;
      }

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

      // Generate contextual mock news
      setNewsItems(generateMockNews(event.title, event.currentPrice));
    } catch (err) {
      console.error("Failed to load event data:", err);
      setError("Failed to load event data. The Polymarket API may be temporarily unavailable.");
    } finally {
      setLoadingChart(false);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in sm:space-y-8">
      {/* Page header */}
      <section>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="mt-1 text-xs text-white/40 sm:text-sm">
          Compare market crowd sentiment against expert superforecaster
          predictions.
        </p>
      </section>

      {/* Error state */}
      {error && !loadingChart && (
        <ErrorCard message={error} onRetry={selected ? () => handleSelectEvent(selected) : loadEvents} />
      )}

      {/* Main grid — chart left, sidebar right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Chart area (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 sm:p-6">
            {/* Event selector */}
            <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="shrink-0">
                <h2 className="text-sm font-medium text-white/80">
                  Event Tracker
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Select a Polymarket event to begin analysis
                </p>
              </div>
              <div className="w-full sm:w-64">
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
            <div className="mt-3 flex items-center gap-4 text-xs sm:mt-4 sm:gap-6">
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-6">
          <BrierCard result={brierResult} />
          <MarketInfo event={eventDetail} />

          {/* Expert methodology card — hidden on small screens, shown lg+ */}
          <div className="glass-card p-4 col-span-2 sm:p-5 lg:col-span-1">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Expert Method
            </h3>
            <p className="mt-2 text-[11px] text-white/25 leading-relaxed">
              Time-Decay Smoothing with Extremization. Exponential smoothing
              (&beta;=0.12) filters market noise, then time-varying extremization
              pushes predictions toward 0/1 as the event approaches resolution.
            </p>
          </div>
        </div>
      </div>

      {/* News feed section (full-width timeline below chart) */}
      <section>
        <NewsFeed items={newsItems} />
      </section>
    </div>
  );
}
