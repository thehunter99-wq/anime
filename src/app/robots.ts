import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://animovie.parthakashyap.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Utility and diagnostic routes carry no search value.
        disallow: ['/api/', '/diagnostics'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
