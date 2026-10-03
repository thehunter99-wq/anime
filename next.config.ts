import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', port: '', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 's4.anilist.co', port: '', pathname: '/file/anilistcdn/**' },
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
    ],
    // Performance: enable lazy loading by default
    loader: 'default',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async rewrites() {
    return [
      {
        source: '/assets/js/p-unit.js',
        destination: 'https://pl31625875.profitableratecpmnetwork.com/be/f0/3c/bef03cbd6a8d7712fde3e921125ecc00.js',
      },
      {
        source: '/assets/js/s-unit.js',
        destination: 'https://pl31625876.profitableratecpmnetwork.com/77/43/d2/7743d209f9e5ab47329ac706ebe9fa56.js',
      },
      {
        source: '/assets/js/n-unit.js',
        destination: 'https://pl31625878.profitableratecpmnetwork.com/89898e7af070f78c4da937a6a83f13c7/invoke.js',
      },
      {
        source: '/assets/js/in-content.js',
        destination: 'https://ssat.pro/cdn/client.js',
      },
      {
        source: '/assets/js/propa.js',
        destination: 'https://propellerads.com/propa.js',
      },
      {
        source: '/assets/js/adsterra.js',
        destination: 'https://adsterra.com/adsterra.js',
      },
      {
        source: '/assets/js/hilltop.js',
        destination: 'https://hilltopads.com/hilltop.js',
      },
      // IndexNow key verification file
      {
        source: '/:indexnowkey.txt',
        destination: '/:indexnowkey.txt',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images
        source: '/:path*.(jpg|jpeg|png|webp|avif|gif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Font caching
        source: '/:path*.(woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable server actions logging in dev
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Output file tracing for smaller deployments
  outputFileTracingRoot: __dirname,
  
  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
