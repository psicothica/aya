import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bordo: "#401019", malva: "#733442", champagne: "#e8dbe1",
        cafe: "#2b2316", musgo: "#172815", grafite: "#323232", bg: "#1e0f18",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        script: ["var(--font-script)"],
        body: ["var(--font-body)"],
        caption: ["var(--font-caption)"],
      },
      borderRadius: { pill: "999px" },
    },
  },
  plugins: [],
};
export default config;
