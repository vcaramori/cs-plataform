import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        plannera: {
          primary: "#2d3558",
          orange: "#f7941e",
          sop: "#3a4c8a",
          operations: "#f8b967",
          demand: "#d85d4b",
          soee: "#ea724a",
          ds: "#2ba09d",
          grey: "#5c5b5b",
        }
      },
    },
  },
  plugins: [],
};
export default config;
