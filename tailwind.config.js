/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0b0d12",
        "bg-card": "#131722",
        "cyber-purple": "#A855F7",
        "cyber-emerald": "#10B981",
        "cyber-cyan": "#06B6D4",
        "cyber-amber": "#F59E0B",
        "cyber-border": "#1E2638",
      },
    },
  },
  plugins: [],
};
