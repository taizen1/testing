"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-400/10 border border-red-400/15">
          <AlertTriangle className="h-4 w-4 text-red-400/70" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/60">
            Something went wrong
          </p>
          <p className="mt-1 text-[11px] text-white/55 leading-relaxed">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/8 hover:text-white/70"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
