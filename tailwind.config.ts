import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#7C3AED",
          50: "#F5F3FF",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
      },
      animation: {
        "pop": "pop 240ms ease-out",
        "fade-up": "fade-up 320ms ease-out",
        "vote-pulse": "vote-pulse 2.4s ease-out forwards",
        "reveal-pop": "reveal-pop 600ms ease-out",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "vote-pulse": {
          "0%": { transform: "translateY(20px) scale(0.5)", opacity: "0" },
          "20%": { transform: "translateY(0) scale(1.4)", opacity: "1" },
          "100%": { transform: "translateY(-180px) scale(0.6)", opacity: "0" },
        },
        "reveal-pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
