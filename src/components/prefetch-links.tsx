'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Prefetch links when they enter the viewport (IntersectionObserver)
 * Reduces navigation latency for links the user is likely to click
 */
export function PrefetchLinks() {
  const pathname = usePathname();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.href;

            // Only prefetch same-origin links
            if (href && href.startsWith(window.location.origin)) {
              // Use speculative loading API if available
              if ('prefetch' in HTMLLinkElement.prototype) {
                const prefetchLink = document.createElement('link');
                prefetchLink.rel = 'prefetch';
                prefetchLink.href = href;
                document.head.appendChild(prefetchLink);
              } else {
                // Fallback: fetch with low priority
                fetch(href, { priority: 'low', cache: 'force-cache' }).catch(() => {});
              }
            }

            // Unobserve after prefetching
            observerRef.current?.unobserve(link);
          }
        });
      },
      {
        rootMargin: '100px', // Start prefetching 100px before link enters viewport
        threshold: 0.1,
      }
    );

    // Observe all internal links
    const links = document.querySelectorAll('a[href^="/"]:not([href^="//"])');
    links.forEach((link) => {
      observerRef.current?.observe(link);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pathname]);

  return null;
}

/**
 * Prefetch specific routes on hover (for immediate navigation)
 * Call this from components that have high-probability navigation targets
 */
export function usePrefetchOnHover() {
  const prefetched = useRef(new Set<string>());

  return (href: string) => {
    if (!href || prefetched.current.has(href)) return;
    
    // Only prefetch same-origin
    if (!href.startsWith('/') || href.startsWith('//')) return;
    
    prefetched.current.add(href);
    
    // Use speculative loading API if available
    if ('prefetch' in HTMLLinkElement.prototype) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    } else {
      // Fallback
      fetch(href, { priority: 'low', cache: 'force-cache' }).catch(() => {});
    }
  };
}

/**
 * Preconnect to critical third-party origins
 * Reduces connection establishment time for external resources
 */
export function PreconnectOrigins() {
  const origins = [
    'https://image.tmdb.org',
    'https://s4.anilist.co',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://pl31625875.profitableratecpmnetwork.com',
    'https://pl31625876.profitableratecpmnetwork.com',
    'https://pl31625878.profitableratecpmnetwork.com',
    'https://ssat.pro',
    'https://www.google-analytics.com',
    'https://api.indexnow.org',
  ];

  return (
    <>
      {origins.map((origin) => (
        <link
          key={origin}
          rel="preconnect"
          href={origin}
          crossOrigin="anonymous"
        />
      ))}
      <link rel="dns-prefetch" href="https://vidsrc.pm" />
      <link rel="dns-prefetch" href="https://vidlink.pro" />
      <link rel="dns-prefetch" href="https://www.2embed.cc" />
      <link rel="dns-prefetch" href="https://vidsrc.sbs" />
      <link rel="dns-prefetch" href="https://autoembed.co" />
    </>
  );
}