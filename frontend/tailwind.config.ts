import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#140202",
        foreground: "#FFFFFF",
        guara: {
          bg: "#140202",
          surface: "#220505",
          hover: "#330808",
          border: "rgba(255, 52, 0, 0.15)",
          vermilion: "#FF3400",
          orange: "#FA8E00",
          muted: "#B88B8B"
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;