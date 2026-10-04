'use client';

import { useEffect, useRef, useState } from 'react';

import { NATIVE_BANNER_CONTAINER_ID, NATIVE_BANNER_URL, AD_RESERVED_HEIGHT } from '@/config/ads';

export function NativeBannerAd({
  className,
  label = 'Advertisement',
}: {
  className?: string;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptInjected = useRef(false);

  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;
    if (scriptInjected.current) return;
    if (document.getElementById('adsterra-native-banner-script')) return;

    const script = document.createElement('script');
    script.id = 'adsterra-native-banner-script';
    script.src = NATIVE_BANNER_URL;
    script.async = true;
    container.appendChild(script);
    scriptInjected.current = true;

    return () => {
      scriptInjected.current = false;
      const existing = document.getElementById('adsterra-native-banner-script');
      if (existing && existing.parentNode === container) {
        existing.remove();
      }
      container.innerHTML = '';
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div
        className={`w-full min-h-[90px] ${className ?? ''}`}
        data-ad-slot="native-banner"
        aria-label={label}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      id={NATIVE_BANNER_CONTAINER_ID}
      className={className}
      data-ad-slot="native-banner"
      aria-label={label}
    />
  );
}

export default NativeBannerAd;