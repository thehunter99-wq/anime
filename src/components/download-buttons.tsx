'use client';

import { useState } from 'react';
import { Download, Loader2, Zap } from 'lucide-react';
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

/**
 * Primary button routes through the Adsterra Smartlink (monetised), secondary
 * goes straight to the mirror. A plain `<a target="_blank">` is used rather
 * than window.open so mobile browsers and popup blockers behave predictably.
 */
export default function DownloadButtons({
  directUrl,
  episodeLabel,
  className,
  isManga,
}: DownloadButtonsProps) {
  const [loading, setLoading] = useState(false);

  if (!directUrl) return null;

  const suffix = episodeLabel ? ` (${episodeLabel})` : '';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 sm:flex-row sm:items-center',
        className
      )}
    >
      <Button
        asChild
        size="lg"
        onClick={() => setLoading(true)}
        className={cn(
          'w-full font-semibold sm:flex-1',
          !isManga && 'bg-red-600 text-white hover:bg-red-700'
        )}
      >
        <a
          href={SMARTLINK_URL}
          target="_blank"
          rel="noopener noreferrer nofollow noopener"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Fast HD Download{suffix}
        </a>
      </Button>

      <Button
        asChild
        size="lg"
        variant="outline"
        className={cn(
          'w-full sm:flex-1',
          isManga && 'bg-white dark:bg-stone-800'
        )}
      >
        <a href={directUrl} target="_blank" rel="noopener noreferrer nofollow">
          <Download className="mr-2 h-4 w-4" />
          Direct Server{suffix}
        </a>
      </Button>
    </div>
  );
}
