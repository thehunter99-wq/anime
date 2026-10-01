'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * localStorage-backed progress and watchlist.
 *
 * Every read is guarded because this module is imported by client components that
 * also render on the server. Hydration is the other hazard: the server has no
 * storage, so `items` starts empty and is filled in an effect. Components must
 * render nothing until `ready` is true, otherwise the server HTML and the first
 * client render disagree — the same hydration-mismatch trap as the ad scripts.
 */

const PROGRESS_KEY = 'animovie:progress:v1';
const WATCHLIST_KEY = 'animovie:watchlist:v1';

export type ProgressItem = {
  id: string;
  /** 'anime' | 'manga' | 'movie' | 'tv' */
  type: string;
  title: string;
  posterPath: string | null;
  season: number;
  episode: number;
  /** Epoch ms of the last watch, used for "Resume S1 E4". */
  timestamp: number;
  /** Canonical path that resumes at the saved episode. */
  href: string;
};

/** Keeps localStorage bounded; oldest entries are dropped first. */
const MAX_ITEMS = 24;

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Private browsing modes and corrupted values must never break playback.
    return [];
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — silently degrade.
  }
}

/** Most recently watched first. */
export function readProgress(): ProgressItem[] {
  return read<ProgressItem>(PROGRESS_KEY).sort((a, b) => b.timestamp - a.timestamp);
}

export function saveProgress(item: ProgressItem) {
  const withoutDuplicate = read<ProgressItem>(PROGRESS_KEY).filter((i) => i.href !== item.href);
  write(PROGRESS_KEY, [item, ...withoutDuplicate].slice(0, MAX_ITEMS));
}

export function clearProgressItem(href: string) {
  write(PROGRESS_KEY, read<ProgressItem>(PROGRESS_KEY).filter((i) => i.href !== href));
}

export function readWatchlist(): ProgressItem[] {
  return read<ProgressItem>(WATCHLIST_KEY);
}

export function isInWatchlist(href: string) {
  return read<ProgressItem>(WATCHLIST_KEY).some((i) => i.href === href);
}

export function toggleWatchlist(item: ProgressItem) {
  const current = read<ProgressItem>(WATCHLIST_KEY);
  const exists = current.some((i) => i.href === item.href);
  write(
    WATCHLIST_KEY,
    exists ? current.filter((i) => i.href !== item.href) : [item, ...current].slice(0, MAX_ITEMS)
  );
  return !exists;
}

/**
 * Storage hook helpers. `ready` flips true only after the first client-side
 * read, so callers can suppress server/client divergence.
 */

export function useProgress() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readProgress());
    setReady(true);
  }, []);

  const remove = useCallback((href: string) => {
    clearProgressItem(href);
    setItems(readProgress());
  }, []);

  const clearAll = useCallback(() => {
    write(PROGRESS_KEY, []);
    setItems([]);
  }, []);

  return { items, ready, remove, clearAll };
}

export function useWatchlist() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readWatchlist());
    setReady(true);
  }, []);

  return { items, ready };
}