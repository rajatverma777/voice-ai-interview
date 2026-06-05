/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Outfit'", "sans-serif"],
      },
      colors: {
        void: "#070a13",
        surface: "#0c1122",
        panel: "#121a30",
        border: "#1e294b",
        accent: "#00d2ff",
        "accent-glow": "rgba(0, 210, 255, 0.25)",
        teal: "#6366f1", // Map teal to premium indigo
        "teal-glow": "rgba(99, 102, 241, 0.25)",
        text: {
          primary: "#f8fafc",
          secondary: "#cbd5e1",
          muted: "#64748b",
        },
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 4s linear infinite",
        float: "float 6s ease-in-out infinite",
        "waveform": "waveform 1.2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        waveform: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 25px rgba(0, 210, 255, 0.2)",
        "glow-teal": "0 0 25px rgba(99, 102, 241, 0.2)",
        "glow-sm": "0 0 12px rgba(0, 210, 255, 0.15)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
