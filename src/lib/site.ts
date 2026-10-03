/**
 * Single source of truth for site-wide identity.
 *
 * Previously duplicated across sitemap.ts, robots.ts and the root layout, which
 * meant a rename had to be applied in several places. Change SITE_NAME here to
 * rebrand the whole app, including social share text.
 */
export const SITE_NAME = 'MovAnime';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://movanime.site';

/**
 * Short brand promise shown next to the logo in the header and reused in the
 * default site metadata.
 *
 * Kept as one constant so the header, the metadata and any future share copy
 * cannot drift apart. It leads with "Watch" because that is the highest-intent
 * verb for this category; "Download" is included because the download buttons
 * are a primary conversion path on every detail page.
 */
export const SITE_TAGLINE = 'Watch Online and Download';

/** Support/community link used by the report and request buttons. */
export const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/parthakashyap';