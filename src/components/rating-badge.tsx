import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

type RatingBadgeProps = {
  /** Average on a 0-10 scale, already normalised by the caller. */
  average?: number | null;
  /** Number of votes. `null` for sources like AniList that do not expose one. */
  votes?: number | null;
  /** Which upstream supplied the number, shown as the citation. */
  label: string;
  className?: string;
};

/**
 * Renders the rating that is also emitted as `aggregateRating` in the page's
 * JSON-LD.
 *
 * ── Why this component is not optional decoration ────────────────────────────
 * Google's structured-data policy treats `aggregateRating` as a factual claim
 * about ratings *shown on that page*. Emitting it while the page shows no rating
 * is a violation that can earn a manual action — a far worse outcome than simply
 * having no stars. So the same numbers are rendered here and passed to
 * `buildMediaJsonLd`, which keeps the visible content and the markup from ever
 * disagreeing.
 *
 * The upstream is credited inline ("TMDB", "AniList") because presenting a
 * third-party community score as if it were first-party editorial is misleading.
 *
 * Returns `null` when there is no usable score, so callers can drop it into the
 * badge row unconditionally instead of guarding each one.
 */
export function RatingBadge({ average, votes, label, className }: RatingBadgeProps) {
  if (average == null || !Number.isFinite(average) || average <= 0) return null;

  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
    average
  );

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-sm font-semibold text-amber-400',
        className
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      <span>
        {formatted}
        <span className="sr-only"> out of 10</span>
      </span>
      {votes != null && (
        <span className="font-normal text-muted-foreground">
          ({new Intl.NumberFormat('en-US').format(votes)} votes)
        </span>
      )}
      <span className="font-normal text-muted-foreground">· {label}</span>
    </span>
  );
}

export default RatingBadge;