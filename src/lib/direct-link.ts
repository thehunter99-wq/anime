import { DIRECT_LINK_CAP } from '@/config/ads';

/**
 * Rolling-window trigger counter for the player overlay.
 *
 * Kept separate from the React component so the cap rules can be reasoned about
 * (and changed) without touching rendering logic.
 *
 * Storage is best-effort by design: Safari private mode, disabled site data and
 * quota-exceeded all throw. Those cases resolve to an uncapped counter rather
 * than breaking playback, and the in-memory fallback still caps the current tab.
 */

function readWindow(): number[] {
  try {
    const raw = window.localStorage.getItem(DIRECT_LINK_CAP.storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function writeWindow(timestamps: number[]): void {
  try {
    window.localStorage.setItem(DIRECT_LINK_CAP.storageKey, JSON.stringify(timestamps));
  } catch {
    // Storage unavailable or full — the in-memory copy below still enforces the cap.
  }
}

/** Timestamps still inside the rolling window. */
function activeTriggers(now: number): number[] {
  const cutoff = now - DIRECT_LINK_CAP.windowMs;
  return readWindow().filter((t) => now - t < DIRECT_LINK_CAP.windowMs);
}

/** True when the overlay has already fired its budget and must stay hidden. */
export function isDirectLinkCapped(now = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  return activeTriggers(now).length >= DIRECT_LINK_CAP.maxTriggers;
}

/**
 * Records a trigger and reports whether the overlay may show again.
 *
 * Returns false once the cap is reached, which is the caller's signal to unmount
 * the overlay for good rather than re-arming it.
 */
export function recordDirectLinkTrigger(now = Date.now()): boolean {
  const remaining = [...activeTriggers(now), now];
  writeWindow(remaining);
  return remaining.length < DIRECT_LINK_CAP.maxTriggers;
}

/** Number of triggers left in the current window. */
export function remainingDirectLinkTriggers(now = Date.now()): number {
  if (typeof window === 'undefined') return DIRECT_LINK_CAP.maxTriggers;
  return Math.max(0, DIRECT_LINK_CAP.maxTriggers - activeTriggers(now).length);
}