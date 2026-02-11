export default function Home() {
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
            {/* Event selector placeholder */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white/80">
                  Event Tracker
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Select a Polymarket event to begin analysis
                </p>
              </div>
              <div className="glass-card-inset px-3 py-1.5 text-xs text-white/40">
                Select event...
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.01]">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sage-400/10 border border-sage-400/15">
                  <svg
                    className="h-5 w-5 text-sage-400/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <p className="text-xs text-white/30">
                  Market vs. Superforecaster chart
                </p>
                <p className="text-[10px] text-white/20 mt-1">
                  Recharts + Framer Motion
                </p>
              </div>
            </div>

            {/* Legend placeholders */}
            <div className="mt-4 flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sage-400" />
                <span className="text-white/50">Market Crowd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-periwinkle-400" />
                <span className="text-white/50">Superforecaster</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-4 rounded-full bg-white/10" />
                <span className="text-white/35">Confidence interval</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — stats + info (1/3 width) */}
        <div className="space-y-6">
          {/* Brier score card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Brier Score
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-sage-400">
                --
              </span>
              <span className="text-xs text-white/30">/ 1.00</span>
            </div>
            <p className="mt-2 text-[11px] text-white/25">
              Lower is better. Measures calibration accuracy.
            </p>
          </div>

          {/* Market info card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Market Info
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-white/35">Volume</span>
                <span className="text-white/60">--</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/35">Liquidity</span>
                <span className="text-white/60">--</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/35">End Date</span>
                <span className="text-white/60">--</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/35">Current Price</span>
                <span className="text-white/60">--</span>
              </div>
            </div>
          </div>

          {/* Expert methodology card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Expert Method
            </h3>
            <p className="mt-2 text-[11px] text-white/25 leading-relaxed">
              Superforecaster line combines Inside View (base rates,
              historical data) with Outside View (reference class) using Brier-optimal
              weighting.
            </p>
          </div>
        </div>
      </div>

      {/* News feed section (below chart) */}
      <section>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/80">
              News Impact Feed
            </h2>
            <span className="text-[10px] text-white/25 uppercase tracking-wider">
              Coming soon
            </span>
          </div>
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.01]">
            <p className="text-xs text-white/20">
              Real-time news events that may shift expert predictions
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
