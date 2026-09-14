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
          bg: '#FAF8F5',          // Warm light ground (Reference exact)
          ground: '#FAF8F5',      // Warm light ground
          surface: '#FFFFFF',     // Clean white surface
          card: '#FFFFFF',        // Clean white card surface
          border: '#000000',      // Pure black structural borders
          black: '#000000',       // Pure black
          pink: '#FE90E8',        // Bubblegum Neo Pink (Reference exact)
          cyan: '#C0F7FE',        // Ice Neo Cyan (Reference exact)
          green: '#99E885',       // Fresh Neo Green (Reference exact)
          lime: '#99E885',        // Fresh Neo Green / Lime
          yellow: '#F7CB46',      // Golden Honey Neo Yellow (Reference exact)
          butter: '#FFDC8B',      // Pastel Butter Yellow (Reference exact)
          purple: '#C084FC',      // Vivid Lilac
          orange: '#FF8A3D',      // Tactile Neo Orange
          gold: '#F7CB46',        // 1st place gold
          silver: '#E2E8F0',      // 2nd place silver
          bronze: '#FFDC8B',      // 3rd place bronze
        },
      },
      boxShadow: {
        'neo-xs': '1px 1px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
        'neo-pink': '4px 4px 0px 0px #FE90E8',
        'neo-cyan': '4px 4px 0px 0px #C0F7FE',
        'neo-green': '4px 4px 0px 0px #99E885',
        'neo-yellow': '4px 4px 0px 0px #F7CB46',
        'glow-cyan': '0 0 20px -3px rgba(192, 247, 254, 0.6)',
        'glow-purple': '0 0 25px -3px rgba(254, 144, 232, 0.6)',
        'glow-gold': '0 0 25px 0px rgba(247, 203, 70, 0.6)',
      },
    },
  },
  plugins: [],
};
export default config;
