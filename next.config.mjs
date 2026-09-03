/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Authorize cross-device tunneling and LAN origins in Next.js
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.223.116.152',
    '*.trycloudflare.com',
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.pinggy.link',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
