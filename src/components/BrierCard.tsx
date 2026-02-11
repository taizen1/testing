"use client";

import { motion } from "framer-motion";
import type { BrierResult } from "@/lib/types";

interface BrierCardProps {
  result: BrierResult | null;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const width = Math.min(score * 100 / 0.25, 100); // Scale relative to 0.25 (coin flip)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/35">{label}</span>
        <span className="text-white/60 font-medium">{score.toFixed(4)}</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function BrierCard({ result }: BrierCardProps) {
  const hasData = result !== null && result.sampleSize > 0;
  const expertWins = hasData && result.expertScore < result.marketScore;

  return (
    <div className="glass-card p-5">
      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
        Brier Score
      </h3>

      {hasData ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-semibold ${expertWins ? "text-sage-400" : "text-periwinkle-400"}`}>
              {result.expertScore.toFixed(4)}
            </span>
            <span className="text-xs text-white/30">/ 1.00</span>
          </div>
          <p className="mt-1 text-[10px] text-white/20">
            Expert {expertWins ? "outperforms" : "trails"} market ({result.sampleSize} samples)
          </p>

          <div className="mt-4 space-y-3">
            <ScoreBar label="Market" score={result.marketScore} color="#6ee7b7" />
            <ScoreBar label="Expert" score={result.expertScore} color="#818cf8" />
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-sage-400">--</span>
            <span className="text-xs text-white/30">/ 1.00</span>
          </div>
          <p className="mt-2 text-[11px] text-white/25">
            Lower is better. Measures calibration accuracy.
          </p>
        </>
      )}
    </div>
  );
}
