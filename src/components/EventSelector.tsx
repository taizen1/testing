"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { EventSummary } from "@/lib/types";

interface EventSelectorProps {
  events: EventSummary[];
  selected: EventSummary | null;
  onSelect: (event: EventSummary) => void;
  loading?: boolean;
}

function formatVolume(vol: string): string {
  const n = parseFloat(vol);
  if (isNaN(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function EventSelector({
  events,
  selected,
  onSelect,
  loading,
}: EventSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass-card-inset flex w-full items-center justify-between gap-2 px-3 py-2 text-xs transition-colors hover:border-white/10"
      >
        <span className={selected ? "text-white/70" : "text-white/35"}>
          {loading
            ? "Loading events..."
            : selected
              ? selected.title
              : "Select an event..."}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 glass-card overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-white/6 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-white/25" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events..."
                className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 outline-none"
                autoFocus
              />
            </div>

            {/* Event list */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-white/20">
                  No events found
                </p>
              ) : (
                filtered.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      onSelect(event);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03] ${
                      selected?.id === event.id ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-400/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/70 truncate">
                        {event.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-white/30">
                        <span>{formatVolume(event.volume)} vol</span>
                        <span>
                          {(event.currentPrice * 100).toFixed(0)}% YES
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
