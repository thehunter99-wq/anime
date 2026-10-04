'use client';

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
        <AdSlot key={position} format="fluid" label="Advertisement" className={className} />
      ))}
    </>
  );
}

export default BannerSlots;