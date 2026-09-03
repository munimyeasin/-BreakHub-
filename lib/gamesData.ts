import { Game } from './types';

export const INITIAL_GAMES: Game[] = [
  {
    id: 'g_shooter_07',
    slug: 'neon-starfighter',
    title: 'Neon Starfighter',
    category: 'ARCADE',
    thumbnail_url: '/thumbnails/neon-starfighter.svg',
    description: 'Retro-arcade space combat simulator with plasma lasers and drone swarms.',
    play_count: 0,
    rating: 4.9,
    rating_count: 28,
    status: 'active',
    featured: true
  },
  {
    id: 'g_multi_xo_13',
    slug: 'multidimension-xo',
    title: 'Multidimension XO',
    category: 'STRATEGY',
    thumbnail_url: '/thumbnails/multidimension-xo.svg',
    description: 'Ultimate 9-field nested Tic-Tac-Toe! Win local 3x3 grids to capture giant macro-nodes and defeat Overthinker Final Boss.',
    play_count: 0,
    hype_count: 156,
    status: 'coming_soon'
  },
  {
    id: 'g_slicer_11',
    slug: 'cyber-slicer',
    title: 'Cyber Slicer',
    category: 'ACTION',
    thumbnail_url: '/thumbnails/cyber-slicer.svg',
    description: 'Neon Katana Fruit Slicer! Slash flying cyber fruits, chain multi-slice combos, and dodge explosive plasma bombs.',
    play_count: 0,
    hype_count: 89,
    status: 'coming_soon'
  }
];
