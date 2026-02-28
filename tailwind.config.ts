import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0d1117", card: "#161b22", hover: "#2d333b" },
        border: { DEFAULT: "#30363d" },
        fg: { DEFAULT: "#f0f6fc", muted: "#8b949e" },
      },
    },
  },
  plugins: [],
};
export default config;
