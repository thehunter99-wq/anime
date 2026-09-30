'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type SearchFilter = 'all' | 'movies' | 'tv' | 'anime';

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'anime', label: 'Anime / Animation' },
];

type SearchFilterTabsProps = {
  query: string;
  active: SearchFilter;
  counts: Record<SearchFilter, number>;
};

/**
 * Filter chips for a search results page.
 *
 * Links rather than buttons, so a filter is a real navigable URL that can be
 * shared, bookmarked and server-rendered — and so it works without JS.
 */
export default function SearchFilterTabs({
  query,
  active,
  counts,
}: SearchFilterTabsProps) {
  return (
    <nav
      aria-label="Filter search results"
      className="flex flex-wrap items-center gap-2"
    >
      {FILTERS.map(({ id, label }) => {
        const isActive = active === id;
        const count = counts[id] ?? 0;

        return (
          <Link
            key={id}
            href={`/?query=${encodeURIComponent(query)}&tab=${id}`}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {label}
            <span
              className={cn(
                'text-xs tabular-nums',
                isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
