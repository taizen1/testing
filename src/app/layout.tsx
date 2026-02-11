import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymarket Superforecaster",
  description:
    "Market Crowd vs. Expert Superforecaster predictions — powered by Brier Scoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-charcoal-950 text-white antialiased">
        {/* Ambient background glow orbs */}
        <div
          className="ambient-orb"
          style={{
            width: 600,
            height: 600,
            top: "-10%",
            left: "20%",
            background:
              "radial-gradient(circle, rgba(110,231,183,0.05) 0%, transparent 70%)",
          }}
        />
        <div
          className="ambient-orb"
          style={{
            width: 500,
            height: 500,
            bottom: "5%",
            right: "10%",
            background:
              "radial-gradient(circle, rgba(129,140,248,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Top navigation bar */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-glass">
          <div
            className="backdrop-blur-glass"
            style={{ backdropFilter: "blur(16px)" }}
          >
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
              {/* Logo / Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-400/10 border border-sage-400/20">
                  <span className="text-sage-400 text-sm font-bold">SF</span>
                </div>
                <span className="text-sm font-semibold tracking-tight text-white/90">
                  Superforecaster
                </span>
                <span className="ml-2 rounded-full bg-periwinkle-400/10 px-2 py-0.5 text-[10px] font-medium text-periwinkle-400 border border-periwinkle-400/20">
                  BETA
                </span>
              </div>

              {/* Right nav actions (placeholder) */}
              <nav className="flex items-center gap-4">
                <span className="text-xs text-white/40">
                  Polymarket Gamma API
                </span>
                <div className="h-4 w-px bg-white/10" />
                <div className="h-2 w-2 rounded-full bg-sage-400 animate-pulse-slow" />
                <span className="text-xs text-white/50">Live</span>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
