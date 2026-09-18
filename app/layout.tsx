import type { Metadata, Viewport } from 'next';
import './globals.css';
import FaviconManager from '@/components/ui/FaviconManager';
import { ThemeProvider } from '@/context/ThemeContext';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const NEO_SVG_DATA_URI = `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%20fill%3D%22none%22%3E%3Crect%20x%3D%229%22%20y%3D%229%22%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2213%22%20fill%3D%22%23000000%22/%3E%3Crect%20x%3D%225%22%20y%3D%225%22%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2213%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%223.5%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%205%2020%20L%2020%205%20H%2030%20L%205%2030%20Z%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222.5%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%2047%207%20C%2047%2011.5%2044%2013.5%2041%2014%20C%2044%2014.5%2047%2016.5%2047%2021%20C%2047.5%2016.5%2050.5%2014.5%2053.5%2014%20C%2050.5%2013.5%2047.5%2011.5%2047%207%20Z%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.6%22%20stroke-linejoin%3D%22round%22/%3E%3Ccircle%20cx%3D%2247%22%20cy%3D%2214%22%20r%3D%221%22%20fill%3D%22%23FFFFFF%22/%3E%3Cpath%20d%3D%22M%2018%2025%20H%2040%20C%2045%2025%2048%2028.5%2047%2034.5%20L%2045.5%2042%20C%2044.2%2045%2040.5%2045.5%2038%2043%20C%2035.5%2040.5%2034%2038.5%2029%2038.5%20C%2024%2038.5%2022.5%2040.5%2020%2043%20C%2017.5%2045%2013.8%2045%2012.5%2042%20L%2011%2034.5%20C%2010%2028.5%2013%2025%2018%2025%20Z%22%20fill%3D%22%23000000%22/%3E%3Cpath%20d%3D%22M%2018%2022%20H%2040%20C%2045%2022%2048%2025.5%2047%2031.5%20L%2045.5%2039%20C%2044.2%2042%2040.5%2042.5%2038%2040%20C%2035.5%2037.5%2034%2035.5%2029%2035.5%20C%2024%2035.5%2022.5%2037.5%2020%2040%20C%2017.5%2042%2013.8%2042%2012.5%2039%20L%2011%2031.5%20C%2010%2025.5%2013%2022%2018%2022%20Z%22%20fill%3D%22%230B0819%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222.6%22%20stroke-linejoin%3D%22round%22/%3E%3Cpath%20d%3D%22M%2017.5%2026.5%20H%2020.5%20V%2029%20H%2023%20V%2032%20H%2020.5%20V%2034.5%20H%2017.5%20V%2032%20H%2015%20V%2029%20H%2017.5%20V%2026.5%20Z%22%20fill%3D%22%23A3E635%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22%20stroke-linejoin%3D%22miter%22/%3E%3Ccircle%20cx%3D%2237.5%22%20cy%3D%2226.5%22%20r%3D%222.2%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2241.5%22%20cy%3D%2230.5%22%20r%3D%222.2%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2237.5%22%20cy%3D%2234.5%22%20r%3D%222.2%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2233.5%22%20cy%3D%2230.5%22%20r%3D%222.2%22%20fill%3D%22%23A3E635%22%20stroke%3D%22%23000000%22%20stroke-width%3D%221.2%22/%3E%3Ccircle%20cx%3D%2229%22%20cy%3D%2225.5%22%20r%3D%221.2%22%20fill%3D%22%2300F0FF%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.8%22/%3E%3Crect%20x%3D%2225.5%22%20y%3D%2229.5%22%20width%3D%222.8%22%20height%3D%221.3%22%20rx%3D%220.65%22%20fill%3D%22%23FF4081%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.7%22%20transform%3D%22rotate(-15%2026.9%2030.1)%22/%3E%3Crect%20x%3D%2229.5%22%20y%3D%2229.5%22%20width%3D%222.8%22%20height%3D%221.3%22%20rx%3D%220.65%22%20fill%3D%22%23FFE600%22%20stroke%3D%22%23000000%22%20stroke-width%3D%220.7%22%20transform%3D%22rotate(-15%2030.9%2030.1)%22/%3E%3C/svg%3E`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stressbuster.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Stress Buster | Retro Arcade Mini-Game Portal',
    template: '%s | Stress Buster',
  },
  description: 'Play 20+ instant HTML5 retro arcade mini-games for rapid stress relief. Compete on live global leaderboards, earn XP, unlock trophies, and bust stress with zero installs.',
  applicationName: 'Stress Buster Arcade',
  authors: [
    { name: 'Munim Yeasin', url: 'https://github.com/munimyeasim' },
    { name: 'Tahida' },
    { name: 'Marzia' },
    { name: 'Rahul' },
  ],
  creator: 'Stress Buster Dev Team',
  publisher: 'Stress Buster',
  keywords: [
    'mini-games',
    'stress relief games',
    'retro arcade',
    'neo-brutalist',
    'html5 games',
    'browser games',
    'free arcade games',
    'snake game',
    '2048',
    'minesweeper',
    'candy crush',
    'battleship',
    'word nexus',
    'paper io',
    'mobile arcade',
    'global leaderboard',
    'instant play games',
  ],
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: NEO_SVG_DATA_URI, type: 'image/svg+xml' },
      { url: '/neo-icon.svg?v=5', type: 'image/svg+xml' },
      { url: '/neo-favicon.ico?v=5', sizes: 'any' },
      { url: '/neo-icon.png?v=5', type: 'image/png', sizes: '64x64' },
    ],
    shortcut: NEO_SVG_DATA_URI,
    apple: [
      { url: '/apple-touch-icon.png?v=5', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Stress Buster | Retro Arcade HTML5 Mini-Game Portal',
    description: 'Instant-play 20+ retro arcade mini-games. Live global leaderboards, responsive mobile gamepads, XP progression, zero ads, zero install.',
    url: siteUrl,
    siteName: 'Stress Buster Mini-Game Portal',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Stress Buster Retro Arcade Mini-Game Portal Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stress Buster | Retro Arcade Mini-Game Portal',
    description: 'Instant-play 20+ retro arcade mini-games. Live global ranks, XP leveling, zero lag, pure fun.',
    images: ['/opengraph-image'],
    creator: '@munimyeasim',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0819',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-portal-bg min-h-screen text-slate-100 antialiased selection:bg-portal-cyan selection:text-black">
        <ThemeProvider>
          <FaviconManager />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
