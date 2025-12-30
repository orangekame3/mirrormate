import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          blue: "#00f0ff",
          purple: "#a855f7",
          pink: "#f0f",
          green: "#0f0",
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scan-line": "scan-line 4s linear infinite",
        "flicker": "flicker 0.15s infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            filter: "drop-shadow(0 0 20px currentColor)",
          },
          "50%": {
            opacity: "0.8",
            filter: "drop-shadow(0 0 40px currentColor)",
          },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.97" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "monospace"],
      },
      transitionDuration: {
        "2000": "2000ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
