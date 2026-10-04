'use client';

import { useEffect, useRef } from 'react';

import { NATIVE_BANNER_CONTAINER_ID, NATIVE_BANNER_URL } from '@/config/ads';

export function NativeBannerAd({
  className,
  label = 'Advertisement',
}: {
  className?: string;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.getElementById('adsterra-native-banner-script')) return;

    const script = document.createElement('script');
    script.id = 'adsterra-native-banner-script';
    script.src = NATIVE_BANNER_URL;
    script.async = true;
    container.appendChild(script);
  }, []);

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