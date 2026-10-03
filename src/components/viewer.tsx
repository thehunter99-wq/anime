
'use client';

import { animeOrMangaPath, moviePath, tvPath } from '@/lib/routes';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { type Media } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn, slugify } from '@/lib/utils';
import { getEmbedSources, getDownloadUrl, hasDownload } from '@/lib/embed';
import DownloadButtons from '@/components/download-buttons';
import PlayerOverlay from '@/components/player-overlay';
import { AdSlot } from '@/components/ad-slot';

import { useToast } from '@/hooks/use-toast';
import { saveProgress } from '@/lib/progress-store';
import ReportRequestBar from '@/components/report-request-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


/**
 * Grace period before a server that has not settled is swapped automatically.
 * Long enough that a slow-but-working mirror is not abandoned mid-load, short
 * enough that a visitor on a dead mirror is not left staring at a blank frame.
 */
const WATCHDOG_MS = 4000;

interface ViewerProps {
  media: Media;
  initialItemNumber: number;
  initialSeasonNumber?: number;
  type: 'anime' | 'manga' | 'movie' | 'tv';
  /**
   * TMDB id resolved from the AniList title. Anime carries an AniList id, which
   * no mirror accepts; without this the player would embed an id that always
   * resolves to the provider's "Video Not Found" page.
   */
  tmdbId?: number | null;
}

/**
 * Audio options offered above the player.
 *
 * `dub` drives the explicit dub flag in the vidsrc anime path, which is the one
 * audio switch that is actually enforced by the provider. `lang` is forwarded to
 * the mirror as a hint (ds_lang / multiLang); whether a given title actually
 * carries a Hindi or English audio track is decided by the mirror, not by us.
 */
const LANGUAGE_OPTIONS = [
  { id: 'multi', label: 'Hindi Dubbed', hint: 'Multi-audio', lang: 'hi', dub: true },
  { id: 'sub', label: 'English', hint: 'Subbed', lang: 'en', dub: false },
  { id: 'multi-en', label: 'Multi-Audio', hint: 'All languages', lang: undefined, dub: undefined },
] as const;

export default function Viewer({
  media,
  initialItemNumber,
  initialSeasonNumber = 1,
  type,
  tmdbId = null,
}: ViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Clamped on read as well as on parse: a prop can arrive as NaN, and NaN in
  // an embed URL is exactly what produces a "Video Not Found" page.
  const [itemNumber, setItemNumber] = useState(
    Number.isFinite(initialItemNumber) && initialItemNumber >= 1
      ? initialItemNumber
      : 1
  );
  const [seasonNumber, setSeasonNumber] = useState(
    Number.isFinite(initialSeasonNumber) && initialSeasonNumber >= 1
      ? initialSeasonNumber
      : 1
  );
  const [isDub, setIsDub] = useState(searchParams.get('dub') === '1');
  const [audioLang, setAudioLang] = useState<string | undefined>(
    searchParams.get('lang') ?? undefined
  );

  const isAnime = type === 'anime';
  const isManga = type === 'manga';
  const isMovie = type === 'movie';
  const isTv = type === 'tv';

  /**
   * Movies and series are already TMDB-native. Anime is not: `media.id` is an
   * AniList id, so it is only usable once `tmdbId` has been resolved. Falling
   * back to the AniList id here would embed a frame that is guaranteed to show
   * "Video Not Found", so an unresolved anime gets no id at all and the viewer
   * renders an explicit unavailable state instead.
   */
  const mediaId: number | string | null = (() => {
    if (isMovie || isTv) return media.id;
    if (isAnime) return tmdbId ?? media.imdb_id ?? null;
    return media.imdb_id || media.id;
  })();

  const sources = getEmbedSources(
    type,
    mediaId ?? '',
    itemNumber,
    seasonNumber,
    isDub,
    audioLang,
    { animeAsTmdbId: isAnime && Boolean(tmdbId) }
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeSource = sources[Math.min(sourceIndex, sources.length - 1)];
  const iframeSrc = activeSource?.url ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  /** True only while the auto-fallback timer is actually counting down. */
  const [watchdogArmed, setWatchdogArmed] = useState(false);
  const downloadUrl = getDownloadUrl(type, mediaId ?? '', itemNumber, seasonNumber);

  /** Nothing embeddable: an anime whose TMDB id could not be resolved. */
  const unavailable = sources.length === 0;

  useEffect(() => {
    setSourceIndex(0);
    setLoadFailed(false);
    setIsLoading(true);
  }, [itemNumber, seasonNumber, isDub, audioLang, mediaId, type]);

  /**
   * Auto-fallback watchdog.
   *
   * A cross-origin iframe cannot be introspected, and its onLoad fires even for
   * a provider's own "not found" page, so a dead mirror is indistinguishable
   * from a slow one from the outside. The reliable signal is elapsed time, so a
   * server that has not settled within WATCHDOG_MS is swapped for the next one
   * automatically rather than leaving the visitor on a blank player.
   *
   * A fast onLoad cancels the timer. That is safe for the failure mode that
   * actually matters here: an unreachable host does not render an error page, it
   * hangs, so onLoad never fires and the watchdog always fires. A mirror that
   * answers quickly with its own "not found" page will therefore not trigger an
   * automatic swap — the server buttons below remain the manual escape hatch.
   */
  useEffect(() => {
    if (unavailable || loadFailed || sources.length < 2 || !isLoading) {
      setWatchdogArmed(false);
      return;
    }

    setWatchdogArmed(true);
    const timer = window.setTimeout(() => {
      setSourceIndex((i) => (i < sources.length - 1 ? i + 1 : i));
      if (sourceIndex >= sources.length - 1) setLoadFailed(true);
    }, WATCHDOG_MS);

    return () => {
      window.clearTimeout(timer);
      setWatchdogArmed(false);
    };
  }, [isLoading, iframeSrc, sources.length, sourceIndex, unavailable, loadFailed]);

  const title = media.title.english || media.title.romaji;

  /**
   * Record progress so the homepage can offer "Continue Watching". Written on
   * every episode/season change rather than on a timer, which is accurate enough
   * for resume purposes and costs one localStorage write per navigation.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (isTv) {
      params.set('season', String(seasonNumber));
      params.set('episode', String(itemNumber));
    } else {
      params.set('item', String(itemNumber));
    }

    const query = params.toString();
    const posterPath =
      media.coverImage?.large?.split('/').pop() ?? null;

    saveProgress({
      id: String(media.id),
      type,
      title,
      posterPath,
      season: seasonNumber,
      episode: itemNumber,
      timestamp: Date.now(),
      href: `/view/${type}/${media.id}-${slugify(title)}${
        query ? `?${query}` : ''
      }`,
    });
  }, [media.id, type, title, itemNumber, seasonNumber, isTv, media.coverImage?.large]);
  
  const totalItems = isAnime ? media.episodes : (isTv ? (media.seasons?.find(s => s.season_number === seasonNumber)?.episode_count) : media.chapters);

  useEffect(() => {
    setIsLoading(true);

    const slug = slugify(title);
    let newUrl = `/view/${type}/${media.id}-${slug}`;
    const params = new URLSearchParams();
    
    if (isTv) {
      params.set('season', seasonNumber.toString());
      params.set('episode', itemNumber.toString());
    } else if (isAnime) {
        params.set('item', itemNumber.toString());
    } else if (isManga) {
      params.set('item', itemNumber.toString());
    }

    if (isAnime && isDub) {
      params.set('dub', '1');
    }
    
    const paramsString = params.toString();
    if(paramsString) {
      newUrl += `?${paramsString}`;
    }

    window.history.pushState(null, '', newUrl);

  }, [itemNumber, seasonNumber, isDub, media.id, mediaId, type, title, isAnime, isManga, isTv]);
  

  const handleNavigation = (newItemNumber: number) => {
    if (newItemNumber < 1) {
      toast({
        title: "You're at the beginning!",
        description: "This is the first item.",
      });
      return;
    }
    if (totalItems && newItemNumber > totalItems) {
      toast({
        title: "You've reached the end!",
        description: "This is the last available item.",
      });
      return;
    }
    setItemNumber(newItemNumber);
  };
  
  const handleSeasonChange = (season: number) => {
    setSeasonNumber(season);
    setItemNumber(1); // Reset to first episode of new season
  }

  const backLink = isMovie
    ? moviePath(media.id)
    : isTv
      ? tvPath(media.id)
      : animeOrMangaPath(type, media.id);
  
  const itemLabel = isAnime || isTv ? 'Episode' : 'Chapter';

  return (
    <div className={cn("flex h-screen flex-col text-foreground", isManga ? 'bg-stone-100 dark:bg-stone-900' : 'bg-background')}>
       <header className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 overflow-hidden">
          <Link href={backLink} passHref>
            <Button 
              variant="outline" 
              size="icon" 
              aria-label="Go back to details"
              className={cn(
                'rounded-xl border-slate-200 bg-white/80 backdrop-blur hover:bg-slate-50 hover:border-sky-300 shadow-sm transition-all',
                isManga ? 'bg-white dark:bg-stone-800' : ''
              )}
            >
              <ArrowLeft />
            </Button>
          </Link>
          <div className="flex flex-col overflow-hidden">
            <h1 className="truncate text-lg font-bold text-slate-800">{title}</h1>
            {!isMovie && (
              <span className="text-sm text-muted-foreground">
                {isTv && `Season ${seasonNumber} • `}{itemLabel} {itemNumber}
              </span>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2'>
        {(isTv && media.seasons && media.seasons.length > 1) && (
            <Select onValueChange={(value) => handleSeasonChange(parseInt(value))} defaultValue={seasonNumber.toString()}>
              <SelectTrigger className={cn("w-[150px] rounded-xl border-slate-200 bg-white/80 backdrop-blur", isManga ? 'bg-white dark:bg-stone-800' : '')}>
                <SelectValue placeholder="Select a season" />
              </SelectTrigger>
              <SelectContent>
                {media.seasons.filter(s => s.season_number > 0).map((season) => (
                  <SelectItem key={season.id} value={season.season_number.toString()}>
                    Season {season.season_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        )}
        {isAnime && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="dub-toggle" className={isManga ? 'text-foreground' : ''}>Dub</Label>
            <Switch
              id="dub-toggle"
              checked={isDub}
              onCheckedChange={setIsDub}
            />
          </div>
        )}
        </div>
      </header>

      <main className={cn('flex flex-1 items-center justify-center overflow-hidden', isManga ? '' : 'bg-black')}>
        {unavailable && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              This title could not be matched to a streamable catalogue id, so
              there is nothing to play yet.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Use the report option below to request it — it gets added once the
              catalogue has it.
            </p>
          </div>
        )}
        {!unavailable && isLoading && (
           <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        )}
        {!unavailable && loadFailed && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Every server failed to load this title. It may not be catalogued yet —
              try the download options below.
            </p>
            <Button onClick={() => { setSourceIndex(0); setLoadFailed(false); setIsLoading(true); }} variant="secondary" className="rounded-xl">
              Retry Server 1
            </Button>
          </div>
        )}
        {/* `relative` anchors the Direct Link overlay on top of the iframe.
            The overlay is absolutely positioned and unmounts itself on first
            activation, so every later click reaches the player untouched. */}
        <div className="relative h-full w-full">
          {!unavailable && iframeSrc && !loadFailed && (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              onLoad={() => {
                setIsLoading(false);
                setLoadFailed(false);
              }}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="origin"
              className={cn(
                'h-full w-full border-0',
                isLoading ? 'hidden' : 'block',
                isManga ? 'max-w-4xl' : ''
              )}
              title={`Viewer for ${title}`}
            ></iframe>
          )}

          {/* Re-arms on every episode, season, server and route change, but only
              while the frequency cap allows another trigger. */}
          <PlayerOverlay
            rearmKey={`${type}:${media.id}:${seasonNumber}:${itemNumber}:${sourceIndex}`}
            disabled={isManga}
          />
        </div>
      </main>

      {/* Reserved height is declared on the slot itself, so a blocked or slow ad
          cannot shift the controls below it. */}
      {!isManga && !unavailable && (
        <div className="container mx-auto px-4 pb-3">
          <AdSlot className="mx-auto max-w-3xl" />
        </div>
      )}

      {hasDownload(type) && downloadUrl && (
        <div className="container mx-auto px-4 pb-3">
          <DownloadButtons
            directUrl={downloadUrl}
            episodeLabel={
              isTv ? `S${seasonNumber} E${itemNumber}` : isMovie ? undefined : `Episode ${itemNumber}`
            }
            isManga={isManga}
          />
        </div>
      )}

      {/* Auto-optimisation status: shown only while a watchdog is actually armed. */}
      {!unavailable && !loadFailed && watchdogArmed && (
        <div className="container mx-auto px-4 pb-2">
          <p
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            Auto-Optimizing Stream… Switching server if needed
          </p>
        </div>
      )}

      {!isManga && (
        <ReportRequestBar
          title={title}
          episodeLabel={
            isTv
              ? `S${seasonNumber} E${itemNumber}`
              : isMovie
                ? undefined
                : `Episode ${itemNumber}`
          }
        />
      )}

      {sources.length > 0 && (
        <div className="container mx-auto flex flex-col items-center gap-2 px-4 pb-2">
          {!isManga && (
            <div className="flex w-full flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audio / Language</span>
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    size="sm"
                    variant={audioLang === option.lang ? 'default' : 'secondary'}
                    aria-pressed={audioLang === option.lang}
                    onClick={() => {
                      setAudioLang(option.lang);
                      if (option.dub !== undefined) setIsDub(option.dub);
                    }}
                    className={cn(
                      'h-auto min-w-0 flex-col gap-0 px-3 py-1.5 rounded-xl transition-all duration-200',
                      audioLang === option.lang
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/30'
                        : 'bg-white/80 text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                    )}
                  >
                    <span className="text-xs font-semibold">{option.label}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {option.hint}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {sources.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Video not loading? Pick another server — each is an independent mirror.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Server</span>
            {sources.map((source, index) => (
              <Button
                key={source.id}
                size="sm"
                variant={index === sourceIndex ? 'default' : 'secondary'}
                aria-current={index === sourceIndex ? 'true' : undefined}
                onClick={() => {
                  setSourceIndex(index);
                  setIsLoading(true);
                  setLoadFailed(false);
                }}
                className={cn(
                  'rounded-xl transition-all duration-200',
                  index === sourceIndex
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-500/30'
                    : 'bg-white/80 text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                )}
              >
                {source.label}
                <span className="ml-1.5 text-[10px] uppercase opacity-80">
                  {source.quality}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {(!isMovie) && (
        <footer className="container mx-auto flex items-center justify-between p-4">
          <Button
            onClick={() => handleNavigation(itemNumber - 1)}
            disabled={itemNumber <= 1}
            variant="outline"
            className={cn(
              'rounded-xl border-slate-200 bg-white/80 backdrop-blur hover:bg-slate-50 hover:border-sky-300 shadow-sm transition-all',
              isManga ? 'bg-white dark:bg-stone-800' : ''
            )}
          >
            <ChevronLeft className="mr-2" />
            Previous
          </Button>
          <Button
            onClick={() => handleNavigation(itemNumber + 1)}
            disabled={!!(totalItems && itemNumber >= totalItems)}
            variant="outline"
            className={cn(
              'rounded-xl border-slate-200 bg-white/80 backdrop-blur hover:bg-slate-50 hover:border-sky-300 shadow-sm transition-all',
              isManga ? 'bg-white dark:bg-stone-800' : ''
            )}
          >
            Next
            <ChevronRight className="ml-2" />
          </Button>
        </footer>
      )}
    </div>
  );
}
