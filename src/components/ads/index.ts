/**
 * Barrel for every Adsterra component.
 *
 * Pages import from `@/components/ads`. Keeping the module split by unit
 * (in-content slots, native banner, site-wide units) means a page that only
 * needs a banner does not pull the popunder's dwell logic into its bundle.
 */
export { AdSlot, type AdSlotProps, InContentLoader } from './ad-slot';
export { NativeBannerAd } from './native-banner';
export { BannerSlots } from './banner-slots';
export { AdFrame, AdSkeleton, useAdFilled } from './primitives';

/**
 * Legacy alias. Roughly 30 call sites across the route tree import `AdBanner`;
 * renaming them all is churn with no behavioural gain, so the old name keeps
 * working and points at the same component.
 */
export { AdSlot as AdBanner } from './ad-slot';