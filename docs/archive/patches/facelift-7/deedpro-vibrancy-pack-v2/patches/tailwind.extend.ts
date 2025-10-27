
// Merge into theme.extend in your tailwind.config.ts
export const tailwindExtend = {
  colors: {
    bg: "rgb(var(--bg) / <alpha-value>)",
    fg: "rgb(var(--fg) / <alpha-value>)",
    muted: "rgb(var(--muted) / <alpha-value>)",
    card: "rgb(var(--card) / <alpha-value>)",
    accent: "rgb(var(--accent) / <alpha-value>)",
    ring: "rgb(var(--ring) / <alpha-value>)",
  },
  keyframes: {
    "slow-pan": {
      "0%": { transform: "translate3d(0,0,0) scale(1)" },
      "50%": { transform: "translate3d(-2%, -3%, 0) scale(1.03)" },
      "100%": { transform: "translate3d(0,0,0) scale(1)" },
    },
    "gradient-x": {
      "0%,100%": { backgroundPosition: "0% 50%" },
      "50%": { backgroundPosition: "100% 50%" },
    },
    "pulse-stamp": {
      "0%": { transform: "scale(0.98) rotate(-2deg)", opacity: 0.7 },
      "50%": { transform: "scale(1.02) rotate(-2deg)", opacity: 1 },
      "100%": { transform: "scale(1.00) rotate(-2deg)", opacity: 0.85 },
    },
    marquee: {
      "0%": { transform: "translateX(0)" },
      "100%": { transform: "translateX(-50%)" },
    },
    "shine": {
      "0%": { backgroundPosition: "200% 0" },
      "100%": { backgroundPosition: "-200% 0" },
    },
  },
  animation: {
    "slow-pan": "slow-pan 18s ease-in-out infinite",
    "gradient-x": "gradient-x 8s ease infinite",
    "pulse-stamp": "pulse-stamp 2.6s ease-in-out infinite",
    marquee: "marquee 28s linear infinite",
    shine: "shine 2.2s linear infinite",
  },
  boxShadow: {
    glow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px -8px rgba(56,189,248,0.35)",
    card: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 10px 40px -18px rgba(0,0,0,0.5)",
  }
};
