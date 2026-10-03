'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AdBlockDetectorProps {
  /** Custom message to show when adblock is detected */
  message?: string;
  /**
   * Whether the detector is enabled.
   *
   * DEFAULT OFF, and that is a deliberate reversal of the previous `true`.
   *
   * The detector is opt-in because its false-positive rate was high enough to
   * be a real revenue problem: it treated `opacity: 0` as proof of blocking,
   * but `opacity-0` is our OWN loading state in `AdSlot` — the slot is hidden
   * until the network injects a fill, and stays hidden if the zone has no fill
   * for that visitor's geo. So a completely unblocked visitor running a normal
   * page was told to disable their ad blocker.
   *
   * Beyond being wrong, the nag is the most bounce-prone element on the site:
   * it appears on every page and accuses the user. Turn it on only if you want
   * to measure it, and prefer reading the real numbers in the Adsterra
   * dashboard, which counts blocked requests directly.
   */
  enabled?: boolean;
  /** ClassName for the overlay container */
  className?: string;
  /** Callback when user dismisses the overlay */
  onDismiss?: () => void;
}

/** Shown at most once per session so it can never become a recurring nuisance. */
const DISMISSED_KEY = 'cineverse:adblock-nag:v1';

/**
 * Detects genuine ad blocking, conservatively.
 *
 * Only two signals are trusted, because both are unambiguous:
 *  - an ad network-injected element that is display:none / visibility:hidden
 *  - a reserved slot that has collapsed to zero height
 *
 * A reserved slot is never zero-height (it declares `min-h-[250px]`), so the
 * second signal only trips if the whole subtree was removed from layout — which
 * is what filter lists actually do.
 *
 * Client-side only, after hydration, so there is no SSR mismatch.
 */
export function AdBlockDetector({
  message = 'Our ad partner is being blocked, which is how this site stays free.',
  enabled = false,
  className,
  onDismiss,
}: AdBlockDetectorProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      // Storage blocked; treat as not dismissed.
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => {
      // Only look at nodes the ad network itself created. Selecting our own
      // containers is what produced the false positives before.
      const injected = document.querySelectorAll(
        'aside[aria-label="Advertisement"] iframe, [id^="container-"] iframe, aside[aria-label="Advertisement"] > div > *'
      );

      let blocked = false;
      injected.forEach((node) => {
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          blocked = true;
        }
      });

      setShowOverlay(blocked);
      setChecked(true);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  const handleDismiss = () => {
    setShowOverlay(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Non-fatal: the overlay is dismissed for this page view either way.
    }
    onDismiss?.();
  };

  if (!checked || !showOverlay) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-full max-w-sm animate-[slide-in_0.3s_ease-out]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm text-foreground">{message}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight, side-effect-free ad block probe for use inside other components.
 * Returns true only on the unambiguous signals described above.
 */
export function useAdBlockDetection(): { isBlocked: boolean; checking: boolean } {
  const [isBlocked, setIsBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setChecking(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const injected = document.querySelectorAll(
        'aside[aria-label="Advertisement"] iframe, [id^="container-"] iframe'
      );

      let blocked = false;
      injected.forEach((node) => {
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          blocked = true;
        }
      });

      setIsBlocked(blocked);
      setChecking(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  return { isBlocked, checking };
}