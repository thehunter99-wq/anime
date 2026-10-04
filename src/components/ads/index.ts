export { AdSlot, type AdSlotProps } from './ad-slot';
export { NativeBannerAd } from './native-banner';

/**
 * Legacy alias. Roughly 30 call sites across the route tree import `AdBanner`;
 * renaming them all is churn with no behavioural gain, so the old name keeps
 * working and points at the same component.
 */
export { AdSlot as AdBanner } from './ad-slot';