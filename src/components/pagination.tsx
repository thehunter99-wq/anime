import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type PaginationProps = {
  /** Path of the list being paginated, e.g. `/genre/action`. */
  path: string;
  /** Current page, 1-based. */
  page: number;
  /**
   * Whether a further page exists.
   *
   * Passed in rather than inferred from the item count, because the three rails a
   * landing page combines (TMDB movies, TMDB TV, AniList) return ragged rows —
   * a full page of results does not guarantee another one, and TMDB will happily
   * return the tail of its last page over and over.
   */
  hasNext: boolean;
  className?: string;
};

/**
 * Numbered pagination for the genre and year landing pages.
 *
 * ── Why page 1 has no `?page=1` ──────────────────────────────────────────────
 * `?page=1` and the bare path are the same list, and both being crawlable splits
 * the ranking signal between them. So page one is always the bare path and the
 * link back to it omits the query. Deeper pages self-canonicalise with the query
 * included, which is the pattern Google documents for paginated lists.
 *
 * Rendered as a `<nav>` with an `aria-label` because this is the primary way to
 * reach the next page; a row of unlabelled anchors is unusable with a screen
 * reader and says nothing about the list to Google.
 */
export default function Pagination({ path, page, hasNext, className }: PaginationProps) {
  if (page <= 1 && !hasNext) return null;

  const href = (target: number) => (target <= 1 ? path : `${path}?page=${target}`);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-2 pt-4', className)}
    >
      {page > 1 && (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Link>
      )}

      <span className="px-3 py-2 text-sm text-muted-foreground">Page {page}</span>

      {hasNext && (
        <Link
          href={href(page + 1)}
          rel="next"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}