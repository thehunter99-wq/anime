'use client';

/**
 * Shared primitives for the Adsterra units.
 *
 * Nothing in here touches `document` during render. That is deliberate: every
 * ad component is a Client Component inside a Server Component tree, so they are
 * server-rendered for the initial HTML and then hydrated. Reading the DOM in a
 * render body is a hard crash during SSR (`document is not defined`) and, when
 * it survives, is a hydration mismatch. All DOM access happens in effects.
 */
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Resolves true once the ad network has injected children into a container.
 *
 * Gives up after `timeoutMs` so a blocked or unfilled zone collapses its slot
 * instead of holding a permanent grey skeleton. An unfilled reserved space reads
 * as "no ad"; a permanent skeleton reads as "this site is broken" — and it also
 * keeps a permanent `setInterval` alive on every page.
 */
export function useAdFilled(
  containerId: string,
  timeoutMs = 6000
): { settled: boolean; filled: boolean } {
  const [filled, setFilled] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const startedAt = Date.now();

    const check = () => {
      const el = document.getElementById(containerId);
      if (el && el.childElementCount > 0) {
        setFilled(true);
        return true;
      }
      if (Date.now() - startedAt > timeoutMs) {
        setFilled(false);
        return true;
      }
      return false;
    };

    if (check()) return;

    timerRef.current = window.setInterval(() => {
      if (check() && timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 400);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [containerId, timeoutMs]);

  return { settled: filled, filled };
}

/**
 * Placeholder that reserves the ad's height before the network responds.
 *
 * Reserving the height is what keeps CLS at zero; the gradient shimmer signals
 * "loading" without promising content that may never arrive.
 */
export function AdSkeleton({
  className,
  label = 'Advertisement',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-ad-skeleton=""
      className={cn(
        'flex w-full animate-pulse items-center justify-center rounded-xl',
        'bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50',
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <span className="h-2 w-1/3 rounded-full bg-slate-200" />
    </div>
  );
}

/**
 * Standard wrapper for a slot: reserved height, rounded corners, and an
 * `Advertisement` label for accessibility and network policy compliance.
 */
export function AdFrame({
  label,
  heightClass,
  className,
  children,
}: {
  label?: string;
  heightClass: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      data-ad-slot=""
      className={cn(
        'relative w-full overflow-hidden rounded-xl',
        'border border-slate-200/60 bg-slate-50/40',
        heightClass,
        className
      )}
    >
      {children}
    </aside>
  );
}