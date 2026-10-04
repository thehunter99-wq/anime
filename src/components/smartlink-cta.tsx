'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptInjected = useRef(false);

  if (!SMARTLINK_URL) return null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;
    if (scriptInjected.current) return;
    if (document.getElementById('adsterra-smartlink-script')) return;

    const script = document.createElement('script');
    script.id = 'adsterra-smartlink-script';
    script.src = SMARTLINK_URL;
    script.async = true;
    container.appendChild(script);
    scriptInjected.current = true;

    return () => {
      scriptInjected.current = false;
      const existing = document.getElementById('adsterra-smartlink-script');
      if (existing && existing.parentNode === container) {
        existing.remove();
      }
      container.innerHTML = '';
    };
  }, [mounted]);

  if (!mounted) {
    return <div className={cn('w-full min-h-[90px]', className ?? '')} data-ad-slot="smartlink" aria-label="Sponsored offer" />;
  }

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