'use client';

import Script from 'next/script';

import {
  ADSTERRA_KEY,
  IN_CONTENT_ZONE_URL,
} from '@/config/ads';

export type AdSlotProps = {
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = typeof window !== 'undefined'
    ? Math.random().toString(36).slice(2, 10)
    : '';
  const slotId = `adsterra-${format}-${reactId}`;
  const enabled = ADSTERRA_KEY.length > 0 && IN_CONTENT_ZONE_URL.length > 0;

  if (!enabled) return null;

  return (
    <div
      id={slotId}
      data-ad-slot-id={slotId}
      data-ad-format={format}
      data-ad-zone={ADSTERRA_KEY}
      className={className}
      suppressHydrationWarning
    />
  );
}

export function InContentLoader() {
  if (!ADSTERRA_KEY || !IN_CONTENT_ZONE_URL) return null;

  return (
    <Script
      id="adsterra-in-content-loader"
      src={IN_CONTENT_ZONE_URL}
      strategy="afterInteractive"
      async
    />
  );
}

export default AdSlot;