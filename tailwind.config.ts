import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Deep charcoal palette
        charcoal: {
          950: "#0a0a0f",
          900: "#0d0d14",
          850: "#111119",
          800: "#15151f",
          750: "#1a1a26",
          700: "#1f1f2e",
          600: "#2a2a3d",
          500: "#3a3a52",
        },
        // Emerald accent
        emerald: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        // Electric blue accent
        electric: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "glow-emerald":
          "radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 70%)",
        "glow-electric":
          "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
        "glass-sm": "0 4px 16px rgba(0, 0, 0, 0.2)",
        "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.2)",
        "glow-electric": "0 0 20px rgba(59, 130, 246, 0.2)",
      },
      borderColor: {
        glass: "rgba(255, 255, 255, 0.06)",
        "glass-hover": "rgba(255, 255, 255, 0.12)",
      },
      backdropBlur: {
        glass: "16px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
