'use client';

/**
 * Inline Smartlink call-to-action.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * The Smartlink is the highest-EPM unit on the site (Adsterra's own guidance:
 * smartlinks typically out-earn display by a wide margin on entertainment
 * traffic). Until now it was reachable from exactly ONE place: the red "High
 * Speed Fast Download" button inside `DownloadButtons`, which only renders on
 * detail and player pages, and only when a download URL exists.
 *
 * That left the entire browse surface — home, /movies, /anime, /tv, /sub, /dub,
 * /genre, /manga, /trending — unable to earn a smartlink click at all. This
 * component is a reusable, well-labelled entry point that can be dropped onto any
 * of them, so a visitor who never opens a detail page can still convert.
 *
 * ── Why the label is honest ──────────────────────────────────────────────────
 * A smartlink leads to an advertiser offer, not to the content on this site. The
 * link is marked `rel="nofollow sponsored"`, opens in a new tab, and the visible
 * label says what it is ("Sponsored"). Presenting it as a download that never
 * arrives is what gets a smartlink zone rejected, and a rejected zone earns
 * nothing.
 *
 * ── Why `asChild`-style anchor and not a button ──────────────────────────────
 * A real `<a href>` is required for the network to attribute the click and for
 * middle-click / long-press "open in new tab" to work. A button with an onClick
 * loses both, which on mobile is most of the traffic.
 */
import { ArrowRight, Zap } from 'lucide-react';

import { SMARTLINK_URL } from '@/config/ads';
import { cn } from '@/lib/utils';

export type SmartlinkCtaProps = {
  /** Visible label. Defaults to a generic, honest call to action. */
  label?: string;
  /** Small line under the label, e.g. what the visitor should expect. */
  hint?: string;
  /** `banner` is the full-width rail used between sections; `inline` suits cards. */
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
};

export function SmartlinkCta({
  label = 'Unlock Blazing-Fast HD Downloads',
  hint = 'Sponsored offer · No signup required',
  variant = 'banner',
  className,
}: SmartlinkCtaProps) {
  if (!SMARTLINK_URL) return null;

  return (
    <a
      href={SMARTLINK_URL}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      data-ad-slot="smartlink"
      aria-label={`${label} (opens a sponsored offer in a new tab)`}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-xl',
        'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white',
        'shadow-lg shadow-red-500/25 transition-all duration-200',
        'hover:from-red-700 hover:via-rose-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.995]',
        variant === 'banner' && 'w-full px-5 py-4',
        variant === 'compact' && 'w-full px-4 py-2.5',
        variant === 'inline' && 'w-full px-3 py-2 text-sm',
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm',
            variant === 'inline' ? 'h-7 w-7' : 'h-9 w-9'
          )}
          aria-hidden="true"
        >
          <Zap className={cn('fill-current', variant === 'inline' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate font-semibold leading-tight',
              variant === 'inline' ? 'text-sm' : 'text-sm sm:text-base'
            )}
          >
            {label}
          </span>
          {hint && variant !== 'inline' && (
            <span className="truncate text-[11px] font-normal text-white/80">{hint}</span>
          )}
        </span>
      </span>

      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

export default SmartlinkCta;
