import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ed8435",
      },
    },
  },
  safelist: ["flex", "hidden", "rotate-180"],
  plugins: [],
};

export default config;