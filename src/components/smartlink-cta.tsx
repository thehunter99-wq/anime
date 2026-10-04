'use client';

import { useEffect, useRef } from 'react';

import { SMARTLINK_URL } from '@/config/ads';
import { cn } from '@/lib/utils';

export type SmartlinkCtaProps = {
  /** Visible label (kept for backward compatibility — the script controls the UI). */
  label?: string;
  /** Small line under the label (kept for backward compatibility). */
  hint?: string;
  className?: string;
};

export function SmartlinkCta({ className }: SmartlinkCtaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!SMARTLINK_URL) return null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.getElementById('adsterra-smartlink-script')) return;

    const script = document.createElement('script');
    script.id = 'adsterra-smartlink-script';
    script.src = SMARTLINK_URL;
    script.async = true;
    container.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('w-full', className)}
      data-ad-slot="smartlink"
      aria-label="Sponsored offer"
    />
  );
}

export default SmartlinkCta;