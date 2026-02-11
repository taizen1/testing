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
        // Pure dark palette — muted luxury
        charcoal: {
          950: "#09090b",
          900: "#0c0c0f",
          850: "#101013",
          800: "#141418",
          750: "#19191e",
          700: "#1e1e24",
          600: "#28282f",
          500: "#35353e",
        },
        // Desaturated sage accent (Market Crowd)
        sage: {
          300: "#a7f3d0",
          400: "#6ee7b7",
          500: "#4ade80",
          600: "#34d399",
        },
        // Soft periwinkle accent (Superforecaster)
        periwinkle: {
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "glow-sage":
          "radial-gradient(ellipse at center, rgba(110,231,183,0.12) 0%, transparent 70%)",
        "glow-periwinkle":
          "radial-gradient(ellipse at center, rgba(129,140,248,0.12) 0%, transparent 70%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.35)",
        "glass-sm": "0 4px 16px rgba(0, 0, 0, 0.25)",
        "glow-sage": "0 0 24px rgba(110, 231, 183, 0.15)",
        "glow-periwinkle": "0 0 24px rgba(129, 140, 248, 0.15)",
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
