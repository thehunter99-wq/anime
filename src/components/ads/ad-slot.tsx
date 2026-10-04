'use client';

/**
 * In-content banner slot (Adsterra).
 *
 * A bare container. The zone script fills the first element whose id is
 * `container-<zone-key>`, so that exact id is what has to be in the DOM — the
 * payload builds it as the literal `'container-' + key`. There is no polling,
 * no skeleton, no fill detection and no effect cleanup, so nothing here can
 * interfere with the script or be torn down by a navigation.
 *
 * ── ONE SLOT PER PAGE ──────────────────────────────────────────────────────
 * The lookup is a single `getElementById`, so the FIRST `container-<key>`
 * element on the page is the one that fills. Several of these on one page
 * therefore ship duplicate ids and leave all but the first empty. That is why
 * exactly one is mounted in the root layout; any further `AdSlot` in a route
 * tree is an inert duplicate and should be removed rather than added.
 *
 * NOTE: an empty container in server-rendered HTML is expected — the fill is
 * injected at runtime.
 */
import { ADSTERRA_KEY, IN_CONTENT_ZONE_URL } from '@/config/ads';

export type AdSlotProps = {
  className?: string;
  label?: string;
};

export function AdSlot({ className, label = 'Advertisement' }: AdSlotProps) {
  const enabled = ADSTERRA_KEY.length > 0 && IN_CONTENT_ZONE_URL.length > 0;

  if (!enabled) return null;

  return (
    <div
      id={`container-${ADSTERRA_KEY}`}
      data-ad-zone={ADSTERRA_KEY}
      aria-label={label}
      className={className}
    />
  );
}

export default AdSlot;