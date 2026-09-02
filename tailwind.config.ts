import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kiosk: {
          bg: "hsl(var(--kiosk-bg) / <alpha-value>)",
          surface: "hsl(var(--kiosk-surface) / <alpha-value>)",
          border: "hsl(var(--kiosk-border) / <alpha-value>)",
          accent: "hsl(var(--kiosk-accent) / <alpha-value>)",
          muted: "hsl(var(--kiosk-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        kiosk: "0 18px 50px -20px rgb(0 0 0 / 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
