import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    /**
     * `unoptimized: true` — serve provider images directly.
     *
     * Vercel's Image Optimization is a metered service, and the free tier is
     * capped per month. Once exhausted it returns **HTTP 402 Payment Required**
     * for every `/_next/image?url=…` request, so every poster on the site breaks
     * at once. Verified against production: `/_next/image?url=…s4.anilist.co…`
     * returns 402, while the upstream URLs themselves return 200.
     *
     * Posters therefore load straight from `image.tmdb.org` / `s4.anilist.co`,
     * which costs nothing, cannot be exhausted, and cannot 402. The trade-offs
     * are real and accepted here: no automatic format negotiation to AVIF/WebP,
     * and resizing handled by the provider's own URL params.
     *
     * If the Vercel plan is upgraded or the quota is raised, this can be removed
     * along with `formats`.
     */
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', port: '', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 's4.anilist.co', port: '', pathname: '/file/anilistcdn/**' },
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async rewrites() {
    return [
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
