'use client';

import Script from 'next/script';
import { useId, useEffect, useState } from 'react';

import {
  AD_RESERVED_HEIGHT,
  ADSTERRA_KEY,
  IN_CONTENT_LOADER_URL,
  NATIVE_BANNER_CONTAINER_ID,
  NATIVE_BANNER_URL,
} from '@/config/ads';
import { cn } from '@/lib/utils';

function AdSkeleton({ height }: { height: string }) {
  return (
    <div
      className={cn(
        'w-full animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-xl',
        height,
        'flex items-center justify-center overflow-hidden relative'
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
      <div className="w-3/4 h-1/2 bg-slate-300/50 rounded-lg" />
    </div>
  );
}

type AdSlotProps = {
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [adLoaded, setAdLoaded] = useState(false);

  if (!ADSTERRA_KEY) return null;

  useEffect(() => {
    const checkAdLoad = setInterval(() => {
      const slot = document.getElementById(slotId);
      if (slot && slot.children.length > 1) {
        setAdLoaded(true);
      }
    }, 500);
    return () => clearInterval(checkAdLoad);
  }, [slotId]);

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={cn('w-full overflow-hidden relative rounded-xl bg-slate-50/50 border border-slate-200/50', AD_RESERVED_HEIGHT.inContent, className)}
    >
      {!adLoaded && <AdSkeleton height={AD_RESERVED_HEIGHT.inContent} />}
      <div
        id={slotId}
        className={cn('adsterra w-full transition-opacity duration-500', adLoaded ? 'opacity-100' : 'opacity-0')}
        suppressHydrationWarning
      >
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${ADSTERRA_KEY}', format: '${format}', params: {} });`,
          }}
        />
      </div>
      <Script
        id={`adsterra-loader-${slotId}`}
        src={IN_CONTENT_LOADER_URL}
        strategy="lazyOnload"
        async
        onError={() => {
          console.warn('[Adsterra] In-content loader failed to load.');
          setAdLoaded(true);
        }}
      />
    </aside>
  );
}

type NativeBannerAdProps = {
  className?: string;
  label?: string;
};

export function NativeBannerAd({ className, label }: NativeBannerAdProps) {
  const [adLoaded, setAdLoaded] = useState(false);

  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  useEffect(() => {
    const checkAdLoad = setInterval(() => {
      const container = document.getElementById(NATIVE_BANNER_CONTAINER_ID);
      if (container && container.children.length > 0) {
        setAdLoaded(true);
      }
    }, 500);
    return () => clearInterval(checkAdLoad);
  }, []);

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center relative rounded-xl bg-slate-50/50 border border-slate-200/50 overflow-hidden',
        AD_RESERVED_HEIGHT.native,
        className
      )}
    >
      {!adLoaded && <AdSkeleton height={AD_RESERVED_HEIGHT.native} />}
      <aside
        aria-label={label ?? 'Advertisement'}
        className={cn('w-full transition-opacity duration-500', adLoaded ? 'opacity-100' : 'opacity-0')}
      >
        <div id={NATIVE_BANNER_CONTAINER_ID} className="w-full" suppressHydrationWarning />
      </aside>
      <Script
        id="adsterra-native-banner"
        src={NATIVE_BANNER_URL}
        strategy="lazyOnload"
        async
        onError={() => {
          console.warn('[Adsterra] Native banner script failed to load.');
          setAdLoaded(true);
        }}
      />
    </div>
  );
}