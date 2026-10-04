import { Zap } from 'lucide-react';

import { SMARTLINK_URL } from '@/config/ads';
import { cn } from '@/lib/utils';

/**
 * Smartlink — a plain link, never a script.
 *
 * A Smartlink / Direct Link is an ordinary destination URL. Adsterra records the
 * impression when the URL is opened, so the only thing the integration has to
 * do is be a real `<a href target="_blank">`. It used to be injected as a
 * `<script src={SMARTLINK_URL}>`, which cannot work twice over: the response is
 * an HTML landing page, not JavaScript, so the browser refuses to execute it,
 * and the impression is only ever counted on a real navigation.
 *
 * No `useEffect`, no script element, no cleanup — nothing for a route change to
 * break, and no possibility of a `parentNode` error.
 *
 * It is a Server Component: a static anchor needs no client JavaScript at all.
 */
export type SmartlinkCtaProps = {
  /** Visible label. */
  label?: string;
  /** Small line under the label. */
  hint?: string;
  className?: string;
};

export function SmartlinkCta({
  label = 'Fast HD Download',
  hint,
  className,
}: SmartlinkCtaProps) {
  if (!SMARTLINK_URL) return null;

  return (
    <a
      href={SMARTLINK_URL}
      target="_blank"
      rel="noopener noreferrer nofollow"
      data-ad-slot="smartlink"
      className={cn(
        'block w-full rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-3',
        'text-center font-semibold text-white shadow-lg shadow-red-500/25',
        'transition hover:from-red-700 hover:to-red-800',
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <Zap className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-white/80">{hint}</span>
      ) : null}
    </a>
  );
}

export default SmartlinkCta;