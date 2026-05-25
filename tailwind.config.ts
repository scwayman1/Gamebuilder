import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "main-gradient":
          "linear-gradient(150deg, #662D91, #AC469A, #BE1E2D, #EC7725)",
      },
      colors: {
        background: {
          DEFAULT: "hsl(var(--background))",
        },
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          950: "#2E152B",
          900: "#472041",
          800: "#602A57",
          700: "#79346D",
          600: "#923D84",
          500: "#AC469A",
          400: "#BD60AD",
          300: "#CC7BBF",
          200: "#DA97CF",
          100: "#E7B5DF",
          50: "#F2D4EE",
          0: "#FCF5FB",
          DEFAULT: "#AC469A",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          950: "#3F200E",
          900: "#603113",
          800: "#834219",
          700: "#A5541D",
          600: "#C96521",
          500: "#ED7724",
          400: "#F78A40",
          300: "#FE9E5E",
          200: "#FFB37F",
          100: "#FFC9A2",
          50: "#FFE0CA",
          0: "#FFF7F2",
          DEFAULT: "#ED7724",
          foreground: "hsl(var(--primary-foreground))",
        },
        success: {
          600: "hsl(var(--success-600))",
          background: "hsl(var(--success-background))",
        },
        error: {
          800: "hsl(var(--error-800))",
          background: "hsl(var(--error-background))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
