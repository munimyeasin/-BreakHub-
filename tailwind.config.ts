import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          bg: '#0B0819',          // Deep dark violet background
          surface: '#130F26',     // Card surface
          card: '#1C1635',        // Hovered/Active card layer
          border: '#2A224D',      // Subtle neon border
          cyan: '#00F0FF',        // Electric Cyan
          neon: '#9D00FF',        // Neon Purple
          gold: '#FFD700',        // 1st place gold
          silver: '#E2E8F0',      // 2nd place silver
          bronze: '#CD7F32',      // 3rd place bronze
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.45)',
        'glow-purple': '0 0 25px -3px rgba(157, 0, 255, 0.45)',
        'glow-gold': '0 0 25px 0px rgba(255, 215, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
export default config;
