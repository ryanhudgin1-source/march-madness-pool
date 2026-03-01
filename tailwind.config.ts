import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#f0f4f8", card: "rgba(255,255,255,0.55)", hover: "rgba(255,255,255,0.75)" },
        border: { DEFAULT: "rgba(255,255,255,0.45)" },
        fg: { DEFAULT: "#1e293b", muted: "#64748b" },
      },
    },
  },
  plugins: [],
};
export default config;
