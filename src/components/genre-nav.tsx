import Link from 'next/link';

import { FEATURED_GENRES } from '@/lib/genres';
import { cn } from '@/lib/utils';

/**
 * Horizontal genre chips linking to the genre landing pages.
 *
 * ── Why this component exists ────────────────────────────────────────────────
 * A landing page that nothing links to does not get crawled. These chips are the
 * internal-link path into every `/genre/[slug]` page, rendered on the genre pages
 * themselves, on the genre index and in the year pages — so a crawler reaching any
 * one of them can reach the rest in a single hop without the pages having to be
 * pre-rendered.
 *
 * A plain list of links rather than a nav menu: these are content links, and
 * wrapping them in a dropdown would hide them behind an interaction that neither
 * a crawler nor a keyboard user triggers by default.
 */
export default function GenreNav({
  current,
  className,
}: {
  /** Slug of the genre being viewed, rendered as the active chip. */
  current?: string;
  className?: string;
}) {
  return (
    <nav aria-label="Genres" className={cn('flex flex-wrap gap-2', className)}>
      {FEATURED_GENRES.map((genre) => {
        const active = genre.slug === current;

        return (
          <Link
            key={genre.slug}
            href={`/genre/${genre.slug}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent',
              active ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border'
            )}
          >
            {genre.label}
          </Link>
        );
      })}
    </nav>
  );
}