import { POPUNDER_CAP } from '@/config/ads';

/**
 * Rolling-window trigger counter for the popunder.
 * 
 * Session-only storage (sessionStorage) - resets on tab close.
 * Adsterra allows ~1 popunder per 30 min per IP.
 * We enforce 1 per 30 min per session to be safe.
 */
function readWindow(): number[] {
  try {
    const raw = sessionStorage.getItem(POPUNDER_CAP.storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function writeWindow(timestamps: number[]): void {
  try {
    sessionStorage.setItem(POPUNDER_CAP.storageKey, JSON.stringify(timestamps));
  } catch {
    // Storage unavailable - no cap enforced this session
  }
}

/** Timestamps still inside the rolling window. */
function activeTriggers(now: number): number[] {
  const cutoff = now - POPUNDER_CAP.windowMs;
  return readWindow().filter((t) => now - t < POPUNDER_CAP.windowMs);
}

/** True when the popunder has already fired its budget and must stay hidden. */
export function isPopunderCapped(now = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  return activeTriggers(now).length >= POPUNDER_CAP.maxTriggers;
}

/**
 * Records a trigger and reports whether the popunder may show again.
 * Returns false once the cap is reached.
 */
export function recordPopunderTrigger(now = Date.now()): boolean {
  const remaining = [...activeTriggers(now), now];
  writeWindow(remaining);
  return remaining.length < POPUNDER_CAP.maxTriggers;
}

/** Number of triggers left in the current window. */
export function remainingPopunderTriggers(now = Date.now()): number {
  if (typeof window === 'undefined') return POPUNDER_CAP.maxTriggers;
  return Math.max(0, POPUNDER_CAP.maxTriggers - activeTriggers(now).length);
}