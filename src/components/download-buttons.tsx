'use client';

import { Download, Zap, HardDriveDownload, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SMARTLINK_URL } from '@/config/ads';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type DownloadButtonsProps = {
  directUrl: string | null;
  episodeLabel?: string;
  className?: string;
  isManga?: boolean;
};

type Quality = '1080p' | '720p' | '480p';

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

function QualityBadge({ quality }: { quality: Quality }) {
  const colors: Record<Quality, string> = {
    '1080p': 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white',
    '720p': 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
    '480p': 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm', colors[quality])}>
      {quality}
    </span>
  );
}

export default function DownloadButtons({
  directUrl,
  episodeLabel,
  className,
  isManga,
}: DownloadButtonsProps) {
  const [selectedQuality, setSelectedQuality] = useState<Quality>('1080p');

  if (!directUrl) return null;

  const suffix = episodeLabel ? ` (${episodeLabel})` : '';
  const backupUrl = directUrl.replace('https://vidsrc.pm', 'https://vidlink.pro');
  const anchor = 'block w-full text-left';
  const hasSmartlink = Boolean(SMARTLINK_URL);

  const qualityOptions: { value: Quality; label: string; icon: React.ReactNode }[] = [
    { value: '1080p', label: 'Full HD', icon: <Monitor className="h-3.5 w-3.5" /> },
    { value: '720p', label: 'HD', icon: <Tablet className="h-3.5 w-3.5" /> },
    { value: '480p', label: 'SD', icon: <Smartphone className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {hasSmartlink && (
        <Button
          asChild
          size="lg"
          className={cn(
            'w-full font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] transition-all duration-200',
            !isManga && 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40'
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
      )}

      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quality:</span>
        <div className="flex gap-1">
          {qualityOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={selectedQuality === option.value ? 'default' : 'outline'}
              onClick={() => setSelectedQuality(option.value)}
              className={cn(
                'h-auto min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                selectedQuality === option.value
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/30'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
              )}
            >
              {option.icon}
              {option.value}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" variant="outline" className="w-full sm:flex-1 bg-white hover:bg-sky-50 hover:border-sky-300 hover:shadow-md transition-all duration-200">
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={anchor}
          >
            <Download className="mr-2 inline h-4 w-4" />
            Direct Stream{suffix}
            <QualityBadge quality={selectedQuality} />
          </a>
        </Button>

        <Button asChild size="lg" variant="outline" className="w-full sm:flex-1 bg-white hover:bg-sky-50 hover:border-sky-300 hover:shadow-md transition-all duration-200">
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