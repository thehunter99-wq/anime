import { AD_DEBUG_MODE, POPUNDER_CAP } from '@/config/ads';

/**
 * Rolling-window trigger counter for the popunder.
 * 
 * Session-only storage (sessionStorage) - resets on tab close.
 *
 * ── Two rules, both enforced ─────────────────────────────────────────────────
 * Adsterra allows ~1 popunder per 30 min per IP and bans somewhere past 3-5 per
 * session. Both constraints are modelled here:
 *
 *   1. SPACING  (minGapMs)     - no two fires within 30 min of each other. This
 *      is the half the network actually watches, and it is what a single-budget
 *      counter did not express.
 *   2. CEILING  (maxTriggers)  - a hard cap per session/tab, kept under the ban
 *      line so a long visit cannot keep popping indefinitely.
 *
 * `isPopunderCapped` therefore answers "may it fire NOW", not "has it ever
 * fired". A stale implementation that only counted against a rolling window let
 * a visitor earn nothing for 30 minutes at a time even on a two-hour visit.
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
  // Debug mode bypasses the cap so a reload actually shows the unit. This is
  // reachable only when NODE_ENV !== 'production', so the live site is unaffected.
  if (AD_DEBUG_MODE) return false;

  const triggers = activeTriggers(now);

  // Ceiling: the session has already fired its whole budget.
  if (triggers.length >= POPUNDER_CAP.maxTriggers) return true;

  // Spacing: the most recent fire is still inside the gap, so firing now would
  // produce two pops back to back - the exact pattern networks flag.
  const last = triggers.length > 0 ? Math.max(...triggers) : 0;
  return last > 0 && now - last < POPUNDER_CAP.minGapMs;
}

/**
 * Records a trigger and reports whether the popunder may show again.
 * Returns false once the session ceiling is reached.
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