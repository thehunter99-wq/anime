'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlayCircle, X } from 'lucide-react';
import { useProgress, type ProgressItem } from '@/lib/progress-store';
import { getTMDBImageUrl } from '@/lib/tmdb';

/**
 * "Continue Watching" row.
 *
 * Renders nothing until storage has been read. On the server, and on the very
 * first client render, `ready` is false and this returns an empty fragment —
 * which is what keeps the server HTML and client markup identical. The row then
 * appears after hydration. All items are private to the device, so this is
 * client-only by design and must never be fetched on the server.
 */
export default function ContinueWatching() {
  const { items, ready, remove, clearAll } = useProgress();

  if (!ready || items.length === 0) return null;

  return (
    <section aria-labelledby="continue-watching-heading" className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="continue-watching-heading"
          className="text-lg font-semibold sm:text-xl"
        >
          Continue Watching
        </h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => {
          const poster = item.posterPath
            ? getTMDBImageUrl(item.posterPath, 'w500')
            : null;

          return (
          <li key={item.href} className="group relative">
            <Link
              href={item.href}
              className="block overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/60"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                {poster ? (
                  <Image
                    src={poster}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {item.title}
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayCircle className="h-10 w-10 text-white" />
                </span>
              </div>
              <div className="space-y-0.5 p-2">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {resumeLabel(item)}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => remove(item.href)}
              aria-label={`Remove ${item.title} from continue watching`}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

function resumeLabel(item: ProgressItem): string {
  if (item.type === 'tv') return `Resume S${item.season} E${item.episode}`;
  if (item.type === 'anime') return `Resume Episode ${item.episode}`;
  if (item.type === 'manga') return `Resume Chapter ${item.episode}`;
  return 'Resume';
}