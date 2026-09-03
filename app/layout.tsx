import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stress Buster | Mini-Game Portal',
  description: 'Cyberpunk dark-themed HTML5 mobile mini-game portal and competitive global leaderboards.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B0819',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-portal-bg min-h-screen text-slate-100 antialiased selection:bg-portal-cyan selection:text-black">
        {children}
      </body>
    </html>
  );
}
