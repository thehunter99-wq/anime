'use client';

import { Download, Zap, HardDriveDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SMARTLINK_URL } from '@/lib/embed';
import { cn } from '@/lib/utils';

type DownloadButtonsProps = {
  directUrl: string | null;
  /** Season/episode context, used to label the buttons per episode. */
  episodeLabel?: string;
  className?: string;
  isManga?: boolean;
};

function Badge({
  children,
  tone = 'light',
}: {
  children: React.ReactNode;
  tone?: 'light' | 'muted';
}) {
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide',
        tone === 'light'
          ? 'border-white/25 bg-white/15'
          : 'border-border/40 bg-muted text-muted-foreground'
      )}
    >
      {children}
    </span>
  );
}

/**
 * Three download routes, ordered by how likely they are to pay out and then
 * actually deliver:
 *
 *  1. Smartlink — monetised, so it goes first and takes the widest button.
 *  2. Primary mirror — direct, highest quality.
 *  3. Backup mirror — an independently hosted resolver, so one dead mirror does
 *     not dead-end the visitor.
 *
 * Quality badges describe the mirror's advertised ceiling, not a file we serve:
 * these providers stream in-player and have no per-quality download endpoint, so
 * every button opens a player/listing in a new tab rather than fetching a file.
 *
 * Plain <a target="_blank"> links are used instead of window.open so mobile
 * browsers and popup blockers behave predictably.
 */
export default function DownloadButtons({
  directUrl,
  episodeLabel,
  className,
  isManga,
}: DownloadButtonsProps) {
  if (!directUrl) return null;

  const suffix = episodeLabel ? ` (${episodeLabel})` : '';
  const backupUrl = directUrl.replace('https://vidsrc.pm', 'https://vidlink.pro');
  const anchor = 'block w-full text-left';

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <Button
        asChild
        size="lg"
        className={cn(
          'w-full font-semibold',
          !isManga && 'bg-red-600 text-white hover:bg-red-700'
        )}
      >
        <a
          href={SMARTLINK_URL}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={anchor}
        >
          <Zap className="mr-2 inline h-4 w-4" />
          High Speed Fast Download{suffix}
          <Badge>1080p Full HD · Ad</Badge>
        </a>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" variant="outline" className="w-full sm:flex-1">
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={anchor}
          >
            <Download className="mr-2 inline h-4 w-4" />
            Direct Stream{suffix}
            <Badge tone="muted">1080p HD</Badge>
          </a>
        </Button>

        <Button asChild size="lg" variant="outline" className="w-full sm:flex-1">
          <a
            href={backupUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={anchor}
          >
            <HardDriveDownload className="mr-2 inline h-4 w-4" />
            Mobile Stream{suffix}
            <Badge tone="muted">720p / 480p</Badge>
          </a>
        </Button>
      </div>
    </div>
  );
}