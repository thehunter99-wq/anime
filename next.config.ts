import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    /**
     * REMOVED: `unoptimized: true`.
     *
     * That flag served every poster and backdrop at its original resolution,
     * straight from the remote host. On a TMDB `original` backdrop that is
     * routinely 1920px wide and 100-300KB, so the LCP element was paying for
     * megabytes it did not need — the single largest drag on LCP and data usage.
     *
     * With the optimizer enabled, Next serves a correctly sized, modern-format
     * variant (WebP/AVIF where the client supports it) via `srcset`, which is
     * also what makes the `sizes` props on our `<Image>` tags meaningful. With
     * `unoptimized` they were inert.
     *
     * CAVEAT: the optimizer fetches images server-side at request time, so
     * `image.tmdb.org` and `s4.anilist.co` must be reachable from the deployed
     * server. Verify on staging after deploy — if an image host is blocked in
     * your region, images will fail and the fix is to re-add `unoptimized`.
     */
    formats: ['image/avif', 'image/webp'],

    // One year: TMDB and AniList assets are immutable per id+size.
    minimumCacheTTL: 31536000,

    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', port: '', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 's4.anilist.co', port: '', pathname: '/file/anilistcdn/**' },
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
    ],
  },

  /**
   * Ad scripts are third-party and unpredictable, so give them their own slot in
   * the resource order. Without this they compete with our own bundle for
   * bandwidth and delay hydration, which shows up directly in TBT and INP.
   */
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
