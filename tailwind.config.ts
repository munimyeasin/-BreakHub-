import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
      colors: {
        portal: {
          bg: '#0B0819',          // Deep dark violet ground
          surface: '#130F26',     // Card / container surface
          card: '#1C1635',        // Sub-panel / elevated layer
          border: '#2A224D',      // Border accent
          cyan: '#00F0FF',        // Electric Cyan
          yellow: '#FFE600',      // Electric Cyber Yellow
          pink: '#FF4081',        // Hot Neo Pink
          lime: '#A3E635',        // Punchy Acid Lime
          purple: '#C084FC',      // Vivid Lilac / Purple
          orange: '#FF6B00',      // Safety Orange
          neon: '#9D00FF',        // Neon Violet
          gold: '#FFD700',        // 1st place gold
          silver: '#E2E8F0',      // 2nd place silver
          bronze: '#CD7F32',      // 3rd place bronze
        },
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
        'neo-yellow': '4px 4px 0px 0px #FFE600',
        'neo-cyan': '4px 4px 0px 0px #00F0FF',
        'neo-pink': '4px 4px 0px 0px #FF4081',
        'neo-lime': '4px 4px 0px 0px #A3E635',
        'glow-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.45)',
        'glow-purple': '0 0 25px -3px rgba(157, 0, 255, 0.45)',
        'glow-gold': '0 0 25px 0px rgba(255, 215, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
export default config;
