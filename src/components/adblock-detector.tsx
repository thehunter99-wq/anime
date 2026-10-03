'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AdBlockDetectorProps {
  /** Custom message to show when adblock is detected */
  message?: string;
  /** Whether the detector is enabled */
  enabled?: boolean;
  /** ClassName for the overlay container */
  className?: string;
  /** Callback when user dismisses the overlay */
  onDismiss?: () => void;
}

/**
 * AdBlock Detector Component
 *
 * Detects if an extreme AdBlocker (uBlock Origin, AdGuard, etc.) has blocked
 * the ad container elements by checking their computed styles or dimensions.
 * If blocked, shows a subtle overlay asking users to disable AdBlocker.
 *
 * This runs client-side after hydration to avoid SSR mismatches.
 */
export function AdBlockDetector({
  message = 'Please disable your AdBlocker or switch to Server 2 for HD streaming.',
  enabled = true,
  className,
  onDismiss,
}: AdBlockDetectorProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Wait for ads to load (or be blocked) - check after a delay
    const timer = setTimeout(() => {
      const checkAdBlock = () => {
        // Check common ad container selectors that AdBlockers target
        const adSelectors = [
          '[id^="adsterra-"]',
          '[id^="container-"]',
          '.adsterra',
          '[id^="adsterra-loader-"]',
          'aside[aria-label="Advertisement"]',
        ];

        let isBlocked = false;

        for (const selector of adSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const style = window.getComputedStyle(htmlEl);
            // Check if element is hidden, has zero dimensions, or display:none
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.opacity === '0' ||
              htmlEl.offsetWidth === 0 ||
              htmlEl.offsetHeight === 0 ||
              htmlEl.clientWidth === 0 ||
              htmlEl.clientHeight === 0
            ) {
              isBlocked = true;
            }
          });
        }

        // Also check if the ad scripts failed to load
        const adScripts = document.querySelectorAll('script[id^="adsterra-"], script[id^="adsterra-loader-"]');
        let scriptsLoaded = 0;
        adScripts.forEach((script) => {
          const scriptEl = script as HTMLScriptElement;
          // Check if script has loaded by checking if it has a src and no error
          // readyState is not standard on HTMLScriptElement, use alternative check
          if (scriptEl.src && !scriptEl.hasAttribute('data-error')) {
            scriptsLoaded++;
          }
        });

        // If we have ad containers but scripts didn't load, likely blocked
        const hasAdContainers = document.querySelectorAll('[id^="adsterra-"], [id^="container-"], .adsterra').length > 0;
        if (hasAdContainers && scriptsLoaded === 0) {
          isBlocked = true;
        }

        setShowOverlay(isBlocked);
        setChecked(true);
      };

      checkAdBlock();
    }, 5000); // Wait 5 seconds for ads to load/be blocked

    return () => clearTimeout(timer);
  }, [enabled]);

  const handleDismiss = () => {
    setShowOverlay(false);
    onDismiss?.();
  };

  if (!checked || !showOverlay) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-sm w-full animate-slide-in',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-background/95 backdrop-blur border border-border/50 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-foreground">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Lightweight AdBlock detection hook for use in other components
 */
export function useAdBlockDetection(): { isBlocked: boolean; checking: boolean } {
  const [isBlocked, setIsBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setChecking(false);
      return;
    }

    const timer = setTimeout(() => {
      const adContainers = document.querySelectorAll('[id^="adsterra-"], [id^="container-"], .adsterra');
      let blocked = false;

      adContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          htmlEl.offsetWidth === 0 ||
          htmlEl.offsetHeight === 0
        ) {
          blocked = true;
        }
      });

      setIsBlocked(blocked);
      setChecking(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return { isBlocked, checking };
}