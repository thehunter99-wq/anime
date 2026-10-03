import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';
import { cn } from '@/lib/utils';

type SiteBrandProps = {
  className?: string;
  /** Renders the tagline under the wordmark. */
  tagline?: boolean;
  /** Applied to the wordmark itself, so callers can resize it per context. */
  nameClassName?: string;
};

/**
 * Text wordmark for the site.
 *
 * ── Why text and not an image ────────────────────────────────────────────────
 * The site previously rendered `<img src="/logo.png">`, but no such file was
 * ever committed, so the header shipped a broken image on every page. Text is
 * also the better choice here regardless: it stays sharp at any size, costs no
 * request, and stays readable to screen readers and to search engines, none of
 * which can read a raster logo's lettering.
 *
 * ── Colour ───────────────────────────────────────────────────────────────────
 * The wordmark is a gradient clipped to the glyphs. The stops are the site's
 * own palette: `primary` is the cyan already used for buttons and rings, then
 * `chart-4` (violet) and `chart-5` (pink) from globals.css. Using theme tokens
 * rather than hard-coded hex means the brand re-tints automatically if the
 * theme is ever changed, and it keeps the logo from clashing with the accent
 * colour used on primary buttons.
 *
 * `bg-clip-text` with `text-transparent` has one real drawback: if the gradient
 * fails to paint, the name becomes invisible. The dark-mode background is
 * #010816, so a light `drop-shadow` is kept as a cheap safety net that also adds
 * the separation a transparent wordmark needs against the hero backdrop.
 */
export function SiteBrand({
  className,
  tagline = true,
  nameClassName,
}: SiteBrandProps) {
  return (
    <span className={cn('flex flex-col leading-none', className)}>
      <span
        className={cn(
          'bg-gradient-to-r from-primary via-chart-4 to-chart-5 bg-clip-text text-xl font-extrabold tracking-tight text-transparent drop-shadow-[0_1px_2px_rgba(255,255,255,0.18)] sm:text-2xl',
          nameClassName
        )}
      >
        {SITE_NAME}
      </span>

      {tagline && (
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {SITE_TAGLINE}
        </span>
      )}
    </span>
  );
}

export default SiteBrand;