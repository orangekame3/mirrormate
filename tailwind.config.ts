import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./plugins/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/mirrormate-*-plugin/dist/**/*.{js,mjs}",
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
        // Animation state machine animations
        "aware-glow": "aware-glow 2s ease-in-out infinite",
        "listening-ring": "listening-ring 1.5s ease-in-out infinite",
        "thinking-orbit": "thinking-orbit 3s linear infinite",
        "confirming-pulse": "confirming-pulse 1.2s ease-in-out infinite",
        "error-fade": "error-fade 2s ease-in-out forwards",
        "lingering-fade": "lingering-fade 2s ease-out forwards",
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
        // Animation state machine keyframes
        "aware-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(255,255,255,0.1)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(255,255,255,0.2)",
            opacity: "0.95",
          },
        },
        "listening-ring": {
          "0%": {
            transform: "scale(1)",
            opacity: "0.6",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.8",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "0.6",
          },
        },
        "thinking-orbit": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "confirming-pulse": {
          "0%, 100%": {
            opacity: "0.7",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.02)",
          },
        },
        "error-fade": {
          "0%": {
            opacity: "1",
            filter: "hue-rotate(0deg) brightness(1)",
          },
          "20%": {
            filter: "hue-rotate(-15deg) brightness(1.1)",
          },
          "100%": {
            opacity: "0.8",
            filter: "hue-rotate(0deg) brightness(1)",
          },
        },
        "lingering-fade": {
          "0%": { opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { opacity: "0.7" },
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
