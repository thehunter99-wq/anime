'use client';

import { Flag, MessageSquarePlus, ChevronDown } from 'lucide-react';
import { TELEGRAM_URL, SITE_NAME } from '@/lib/site';

type ReportRequestBarProps = {
  title: string;
  /** Current season/episode, appended to the report message. */
  episodeLabel?: string;
};

/**
 * Pre-filled Telegram deep links.
 *
 * Both actions open a chat with the message already composed, so a user reports
 * a broken source in one tap instead of typing the title, the episode and the
 * server they were on. A modal would add a round trip for something that is
 * fundamentally a message to a human.
 */
export default function ReportRequestBar({
  title,
  episodeLabel,
}: ReportRequestBarProps) {
  const context = episodeLabel ? `${title} — ${episodeLabel}` : title;

  const reportHref = `${TELEGRAM_URL}?text=${encodeURIComponent(
    `⚠️ Broken video report\n\nTitle: ${context}\nPage: ${typeof window !== 'undefined' ? window.location.href : ''}`
  )}`;

  const requestHref = `${TELEGRAM_URL}?text=${encodeURIComponent(
    `💬 Content request\n\nI'd like to see this on ${SITE_NAME}:\n\nTitle: ${title}`
  )}`;

  return (
    <div className="container mx-auto px-4 pb-4">
      <details className="rounded-lg border border-border/50 bg-muted/30">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Flag className="h-3.5 w-3.5" />
          Report Broken Video / Request Content
          <ChevronDown className="h-3.5 w-3.5" />
        </summary>

        <div className="flex flex-col gap-2 border-t border-border/50 p-3 sm:flex-row sm:justify-center">
          <a
            href={reportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border/70 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Flag className="h-3.5 w-3.5 shrink-0" />
            Report broken video
          </a>
          <a
            href={requestHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border/70 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
            Request a title
          </a>
        </div>
      </details>
    </div>
  );
}