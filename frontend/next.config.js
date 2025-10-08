/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.imgur.com', 'res.cloudinary.com'], // Add your image hosting domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.farcaster.xyz',
      },
      {
        protocol: 'https',
        hostname: '**.warpcast.com',
      },
    ],
  },
  // Optimize for Vercel deployment
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
}

module.exports = nextConfig

