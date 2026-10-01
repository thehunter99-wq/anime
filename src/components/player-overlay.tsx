'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play } from 'lucide-react';

import { DIRECT_LINK_URL } from '@/config/ads';
import {
  isDirectLinkCapped,
  recordDirectLinkTrigger,
} from '@/lib/direct-link';
import { cn } from '@/lib/utils';

export interface PlayerOverlayProps {
  /**
   * Changing this re-arms the overlay. Pass the episode, season, server index
   * and media id so every navigation the user makes produces a fresh,
   * unmissed opportunity — but still subject to the frequency cap.
   */
  rearmKey: string;
  className?: string;
  /** Disables the overlay for content types that must never be interrupted. */
  disabled?: boolean;
}

/**
 * Transparent Direct Link overlay sitting on top of the video iframe.
 *
 * The entire surface is the click target: the visitor's first natural click to
 * start watching opens the monetised Direct Link in a new tab and removes the
 * overlay, handing the player back immediately. Re-armed on every episode,
 * season, server and route change.
 *
 * The overlay IS the link. Using a real anchor instead of `window.open` means
 * the browser performs the navigation itself, so mobile Safari, popup blockers
 * and middle-click all behave natively — no synthetic click is dispatched, which
 * is also what ad networks look for when flagging forced navigation.
 *
 * Once it unmounts it is gone from the DOM entirely, so every subsequent touch
 * and click reaches the underlying iframe unmodified.
 */
export default function PlayerOverlay({
  rearmKey,
  className,
  disabled = false,
}: PlayerOverlayProps) {
  const [armed, setArmed] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * The cap is read on mount only. SSR cannot see localStorage, so the overlay
   * is rendered after hydration rather than during it — rendering it in SSR and
   * removing it on the client would be a real hydration mismatch.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (disabled || !DIRECT_LINK_URL) {
      setArmed(false);
      return;
    }
    setArmed(!isDirectLinkCapped());
  }, [rearmKey, disabled]);

  const handleActivate = useCallback(() => {
    const mayShowAgain = recordDirectLinkTrigger();
    // Unmount either way: after the budget is spent the overlay stays gone.
    setArmed(mayShowAgain);
  }, []);

  if (!mounted || disabled || !DIRECT_LINK_URL || !armed) return null;

  return (
    <div className={cn('absolute inset-0 z-20', className)}>
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={handleActivate}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Open the stream provider in a new tab"
        className={cn(
          'group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4',
          // Touch-action keeps the tap from being treated as a scroll gesture on
          // mobile, so the first tap reaches the link instead of the page.
          'touch-manipulation select-none'
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-20 sm:w-20">
          <Play className="ml-1 h-7 w-7 fill-current sm:h-9 sm:w-9" />
        </span>

        <span className="rounded-md bg-black/60 px-3 py-1.5 text-center text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
          Continue to the stream provider
        </span>
      </a>
    </div>
  );
}