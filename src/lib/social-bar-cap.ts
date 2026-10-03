import { AD_DEBUG_MODE, SOCIAL_BAR_CAP } from '@/config/ads';

/**
 * Rolling-window trigger counter for the social bar.
 * 
 * Persistent storage (localStorage) - survives sessions.
 * Show once per 24 hours per user. Sticky bar = high annoyance.
 * Only on browse/detail pages (never watch).
 */
function readWindow(): number[] {
  try {
    const raw = window.localStorage.getItem(SOCIAL_BAR_CAP.storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function writeWindow(timestamps: number[]): void {
  try {
    window.localStorage.setItem(SOCIAL_BAR_CAP.storageKey, JSON.stringify(timestamps));
  } catch {
    // Storage unavailable or full
  }
}

/** Timestamps still inside the rolling window. */
function activeTriggers(now: number): number[] {
  const cutoff = now - SOCIAL_BAR_CAP.windowMs;
  return readWindow().filter((t) => now - t < SOCIAL_BAR_CAP.windowMs);
}

/** True when the social bar has already fired its budget and must stay hidden. */
export function isSocialBarCapped(now = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  // See the note in isPopunderCapped: debug mode is non-production only.
  if (AD_DEBUG_MODE) return false;
  return activeTriggers(now).length >= SOCIAL_BAR_CAP.maxTriggers;
}

/**
 * Records a trigger and reports whether the social bar may show again.
 * Returns false once the cap is reached.
 */
export function recordSocialBarTrigger(now = Date.now()): boolean {
  const remaining = [...activeTriggers(now), now];
  writeWindow(remaining);
  return remaining.length < SOCIAL_BAR_CAP.maxTriggers;
}

/** Number of triggers left in the current window. */
export function remainingSocialBarTriggers(now = Date.now()): number {
  if (typeof window === 'undefined') return SOCIAL_BAR_CAP.maxTriggers;
  return Math.max(0, SOCIAL_BAR_CAP.maxTriggers - activeTriggers(now).length);
}