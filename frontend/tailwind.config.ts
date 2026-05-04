import type { Config } from "tailwindcss";

export default {
  content: [
    "./apps/**/*.{html,ts,tsx}",
    "./packages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
