import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stress Buster | Mini-Game Portal',
    short_name: 'StressBuster',
    description: 'Retro arcade neo-brutalist HTML5 mobile-first mini-game portal and competitive global leaderboards.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0819',
    theme_color: '#0B0819',
    orientation: 'any',
    categories: ['games', 'entertainment', 'arcade'],
    icons: [
      {
        src: '/neo-icon.svg?v=5',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/neo-icon.png?v=5',
        sizes: '64x64',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png?v=5',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
