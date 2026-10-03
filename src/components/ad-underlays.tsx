'use client';

import { usePathname } from 'next/navigation';

import { DIRECT_LINK_URL } from '@/config/ads';
import { AdsterraPopunder, AdsterraSocialBar } from '@/components/ads';
import { useEffect } from 'react';

export default function AdUnderlays() {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/view/') ?? false;

  useEffect(() => {
    if (isWatchPage) return;

    const interval = setInterval(() => {
      const socialBar = document.querySelector(
        '[id*="adsterra-social"], [class*="adsterra-social"], [id*="container-"]'
      ) as HTMLElement;
      if (socialBar) {
        socialBar.style.top = 'auto';
        socialBar.style.bottom = '0';
        socialBar.style.left = '0';
        socialBar.style.right = '0';
        socialBar.style.width = '100%';
        socialBar.style.maxWidth = '100%';
        socialBar.style.transform = 'none';
        socialBar.style.borderRadius = '0';
        socialBar.style.position = 'fixed';
        socialBar.style.zIndex = '9999';
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWatchPage]);

  return (
    <>
      {!isWatchPage && <AdsterraSocialBar />}
      {!(isWatchPage && DIRECT_LINK_URL) && <AdsterraPopunder />}
    </>
  );
}