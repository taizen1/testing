import type { NewsItem } from "./types";

/**
 * Generate plausible mock news items based on the event title.
 * In production, this would be replaced by a real news API.
 */
export function generateMockNews(
  eventTitle: string,
  currentPrice: number,
): NewsItem[] {
  const now = Math.floor(Date.now() / 1000);
  const topic = eventTitle.length > 60 ? eventTitle.slice(0, 57) + "..." : eventTitle;

  const templates: Array<{
    title: (t: string) => string;
    source: string;
    impact: NewsItem["impact"];
    offsetMinutes: number;
  }> = [
    {
      title: (t) => `New polling data shifts outlook on "${t}"`,
      source: "Reuters",
      impact: currentPrice > 0.5 ? "positive" : "neutral",
      offsetMinutes: 12,
    },
    {
      title: (t) => `Analysts debate market implications for "${t}"`,
      source: "Bloomberg",
      impact: "neutral",
      offsetMinutes: 47,
    },
    {
      title: (t) => `Key stakeholder makes announcement related to "${t}"`,
      source: "AP News",
      impact: "positive",
      offsetMinutes: 125,
    },
    {
      title: (t) =>
        currentPrice > 0.7
          ? `Market confidence surges as "${t}" nears resolution`
          : `Uncertainty remains high around "${t}"`,
      source: "Financial Times",
      impact: currentPrice > 0.7 ? "positive" : "negative",
      offsetMinutes: 280,
    },
    {
      title: (t) => `Social media sentiment shifts on "${t}"`,
      source: "X / Twitter",
      impact: "neutral",
      offsetMinutes: 480,
    },
    {
      title: (t) => `Contrarian view emerges: experts question consensus on "${t}"`,
      source: "The Economist",
      impact: "negative",
      offsetMinutes: 960,
    },
  ];

  return templates.map((tmpl, i) => ({
    id: `news-${i}-${now}`,
    title: tmpl.title(topic),
    source: tmpl.source,
    timestamp: now - tmpl.offsetMinutes * 60,
    impact: tmpl.impact,
    summary: "",
  }));
}
