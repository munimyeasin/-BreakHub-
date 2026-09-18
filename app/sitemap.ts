import type { MetadataRoute } from 'next';
import { INITIAL_GAMES } from '@/lib/gamesData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stressbuster.vercel.app';
  const currentDate = new Date();

  // Core Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Game Links
  const gameRoutes: MetadataRoute.Sitemap = INITIAL_GAMES.map((game) => ({
    url: `${baseUrl}/?game=${game.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: game.featured ? 0.9 : 0.8,
  }));

  return [...staticRoutes, ...gameRoutes];
}
