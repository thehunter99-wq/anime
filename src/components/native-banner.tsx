'use client';

/**
 * Backwards-compatible path for the global native banner.
 *
 * The implementation now lives in `src/components/ad-slot.tsx` alongside the
 * repeatable in-content slot, so both ad components share one reserved-height
 * and configuration source. See `NativeBannerAd` for the singleton rule.
 */
export { NativeBannerAd as default } from '@/components/ad-slot';