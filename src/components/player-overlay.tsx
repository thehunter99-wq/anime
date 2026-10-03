'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play, Zap, ArrowRight } from 'lucide-react';

import { DIRECT_LINK_URL } from '@/config/ads';
import {
  isDirectLinkCapped,
  recordDirectLinkTrigger,
} from '@/lib/direct-link';
import { cn } from '@/lib/utils';

export interface PlayerOverlayProps {
  rearmKey: string;
  className?: string;
  disabled?: boolean;
}

export default function PlayerOverlay({
  rearmKey,
  className,
  disabled = false,
}: PlayerOverlayProps) {
  const [armed, setArmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (disabled || !DIRECT_LINK_URL) {
      setArmed(false);
      return;
    }
    setArmed(!isDirectLinkCapped());
  }, [rearmKey, disabled]);

  useEffect(() => {
    if (armed) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [armed]);

  const handleActivate = useCallback(() => {
    const mayShowAgain = recordDirectLinkTrigger();
    setArmed(mayShowAgain);
    setVisible(false);
  }, []);

  if (!mounted || disabled || !DIRECT_LINK_URL || !armed || !visible) return null;

  return (
    <div className={cn('absolute inset-0 z-20', className)}>
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={handleActivate}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Open the stream provider in a new tab"
        className={cn(
          'group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4',
          'touch-manipulation select-none'
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-indigo-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-black/70 via-slate-900/80 to-black/70 text-white backdrop-blur-md border border-white/10 shadow-2xl shadow-black/50 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-20 sm:w-20">
            <Play className="ml-1 h-7 w-7 fill-current sm:h-9 sm:w-9" />
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-black/60 via-slate-900/70 to-black/60 px-5 py-2.5 text-center text-xs font-semibold text-white backdrop-blur-md border border-white/10 shadow-lg sm:text-sm">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            Continue to the stream provider
            <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
          </span>
        </div>
      </a>
    </div>
  );
}