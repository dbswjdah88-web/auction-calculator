import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F2B46',
          gold: '#D4A843',
          'gold-light': '#E8C57A',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-kr)', 'Noto Sans KR', 'sans-serif'],
        mono: ['var(--font-noto-sans-kr)', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
