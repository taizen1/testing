"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { NewsItem } from "@/lib/types";

interface NewsFeedProps {
  items: NewsItem[];
}

const impactConfig = {
  positive: { icon: ArrowUpRight, color: "text-sage-400", bg: "bg-sage-400/10" },
  negative: { icon: ArrowDownRight, color: "text-red-400", bg: "bg-red-400/10" },
  neutral: { icon: Minus, color: "text-white/60", bg: "bg-white/5" },
} as const;

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);

  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NewsFeed({ items }: NewsFeedProps) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white/80">
            News Impact Feed
          </h2>
          <span className="text-[10px] text-white/50 uppercase tracking-wider">
            Coming soon
          </span>
        </div>
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.01]">
          <p className="text-xs text-white/45">
            Real-time news events that may shift expert predictions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white/80">
          News Impact Feed
        </h2>
        <span className="text-[10px] text-white/50">
          {items.length} events
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item, i) => {
          const config = impactConfig[item.impact];
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
            >
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${config.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/70 leading-relaxed">
                  {item.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-white/50">
                  <span>{item.source}</span>
                  <span>&middot;</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
