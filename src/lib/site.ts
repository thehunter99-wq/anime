/**
 * Single source of truth for site-wide identity.
 *
 * Previously duplicated across sitemap.ts, robots.ts and the root layout, which
 * meant a rename had to be applied in several places. Change SITE_NAME here to
 * rebrand the whole app, including social share text.
 */
export const SITE_NAME = 'Cineverse HD';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://animovie.parthakashyap.com';

/** Support/community link used by the report and request buttons. */
export const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/parthakashyap';