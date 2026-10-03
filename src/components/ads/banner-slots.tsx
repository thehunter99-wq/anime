'use client';

/**
 * The four banner placements.
 *
 * The placements split by who can host them, because two of them are page-level
 * and two are document-level:
 *
 *   header, footer                 -> root layout, above and below {children}.
 *                                     Mounted once, so every route gets them with
 *                                     no per-page wiring and no risk of a new
 *                                     page shipping with a missing slot.
 *   below-video                    -> `components/viewer.tsx`, because only the
 *                                     player knows where it ends.
 *   above-recommendations           -> each listing page, because only it knows
 *                                     where its rail ends.
 *
 * Passing `positions` keeps a single definition of all four while letting each
 * host render only what it can position correctly. Rendering all four here
 * instead would put "below-video" above the content on every page that has no
 * video, which is worse than not rendering it.
 *
 * These use the in-content format, which supports many instances per page from a
 * single zone key. The native banner, by contrast, is pinned to one container
 * and cannot be repeated — see `native-banner.tsx`.
 */
import { BANNER_SLOTS, type BannerSlotId } from '@/config/ads';
import { AdSlot } from './ad-slot';

const ALL_POSITIONS = BANNER_SLOTS.map((slot) => slot.id);

export function BannerSlots({
  positions = ALL_POSITIONS,
  className,
}: {
  positions?: readonly BannerSlotId[];
  className?: string;
}) {
  return (
    <>
      {positions.map((position) => (
        <div key={position} data-ad-position={position} className={className}>
          <AdSlot format="fluid" label="Advertisement" />
        </div>
      ))}
    </>
  );
}

export default BannerSlots;