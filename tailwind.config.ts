import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /* ─── Semantic tokens (usar esses em componentes novos) ─────────── */
        'surface-background': 'hsl(var(--surface-background))',
        'surface-card':       'hsl(var(--surface-card))',
        'content-primary':    'hsl(var(--content-primary))',
        'content-secondary':  'hsl(var(--content-secondary))',
        'border-divider':     'hsl(var(--border-divider))',

        /* ─── Plannera Official Palette ─────────────────────────────────── */
        'plannera-primary':    'hsl(var(--plannera-primary))',
        'plannera-orange':     'hsl(var(--plannera-orange))',
        'plannera-sop':        'hsl(var(--plannera-sop))',
        'plannera-operations': 'hsl(var(--plannera-operations))',
        'plannera-demand':     'hsl(var(--plannera-demand))',
        'plannera-soe':        'hsl(var(--plannera-soe))',
        'plannera-ds':         'hsl(var(--plannera-ds))',
        'plannera-grey':       'hsl(var(--plannera-grey))',

        /* ─── shadcn/Radix compatibility (mantidos) ─────────────────────── */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        plannera: {
          primary: "hsl(var(--primary))",
          secondary: "hsl(var(--secondary))",
          orange: "hsl(var(--accent))",
          sop: "hsl(var(--secondary))",
          navy: "hsl(var(--primary))",
          operations: "#f8b967", 
          demand: "#d85d4b",
          soee: "#ea724a",
          ds: "#2ba09d",
          grey: "#5c5b5b",
        },
        'brand-primary': "hsl(var(--primary))",
        'brand-grey': "#5c5b5b",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        /*
          Stack tipográfico com Yu Gothic posicionado como suplemento CJK.
          Inter/Outfit têm todos os glifos latinos — o browser os usa para texto latino.
          Yu Gothic entra apenas para caracteres CJK (japonês/coreano/chinês) quando disponível.
          Isso honra o uso da fonte oficial sem sacrificar a legibilidade do UI em português.
        */
        sans: ["var(--font-inter)", "Yu Gothic", "Yu Gothic UI", "YuGothic", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "Yu Gothic", "Yu Gothic UI", "YuGothic", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
