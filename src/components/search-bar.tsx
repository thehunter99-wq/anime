'use client';

import { animeOrMangaPath, moviePath, tvPath } from '@/lib/routes';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, X, Loader2, Tv, Clapperboard, Book, Film } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchFromAniList } from '@/lib/anilist';
import { searchTMDBMulti, getTMDBImageUrl, type UnifiedResult } from '@/lib/tmdb';
import { type Media } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { languageLabel } from '@/lib/languages';

type Suggestion =
  | { kind: 'tmdb'; data: UnifiedResult }
  | { kind: 'anilist'; data: Media };

const TYPE_META = {
  movie: { label: 'Movie', icon: Clapperboard, className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  tv: { label: 'Web Series', icon: Tv, className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  anime: { label: 'Anime', icon: Film, className: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  manga: { label: 'Manga', icon: Book, className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
} as const;

type SuggestionKind = keyof typeof TYPE_META;

function getSuggestionKind(item: Suggestion): SuggestionKind {
  if (item.kind === 'anilist') {
    return item.data.type === 'ANIME' ? 'anime' : 'manga';
  }
  return item.data.mediaType === 'tv' ? 'tv' : 'movie';
}

function getSuggestionUrl(item: Suggestion): string {
  if (item.kind === 'tmdb') {
    const { id, mediaType } = item.data;
    return mediaType === 'tv' ? tvPath(id) : moviePath(id);
  }
  return animeOrMangaPath(item.data.type, item.data.id);
}

function getSuggestionTitle(item: Suggestion): string {
  return item.kind === 'tmdb'
    ? item.data.title || 'Unknown'
    : item.data.title.english || item.data.title.romaji;
}

function getSuggestionImage(item: Suggestion): string | null {
  return item.kind === 'tmdb'
    ? getTMDBImageUrl(item.data.posterPath)
    : item.data.coverImage.large;
}

function getSuggestionYear(item: Suggestion): string | null {
  if (item.kind === 'tmdb') {
    return item.data.releaseDate ? item.data.releaseDate.slice(0, 4) : null;
  }
  return item.data.startDate?.year ? String(item.data.startDate.year) : null;
}

function TypePill({ kind, language }: { kind: SuggestionKind; language?: string | null }) {
  const meta = TYPE_META[kind];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {language ?? meta.label}
    </span>
  );
}

function SearchBarInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialQuery = searchParams.get('query') || '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 350);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setPopoverOpen(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setPopoverOpen(true);

    const run = async () => {
      // TMDB and AniList are queried together; a slow or failing provider must
      // not suppress the other's results.
      const [tmdbResults, animeResults, mangaResults] = await Promise.allSettled([
        searchTMDBMulti(debouncedQuery),
        fetchFromAniList({ search: debouncedQuery, type: 'ANIME', sort: ['SEARCH_MATCH'], perPage: 4 }),
        fetchFromAniList({ search: debouncedQuery, type: 'MANGA', sort: ['SEARCH_MATCH'], perPage: 2 }),
      ]);

      if (cancelled) return;

      const merged: Suggestion[] = [];

      if (tmdbResults.status === 'fulfilled') {
        merged.push(...tmdbResults.value.map((data) => ({ kind: 'tmdb' as const, data })));
      }
      if (animeResults.status === 'fulfilled') {
        merged.push(...animeResults.value.map((data) => ({ kind: 'anilist' as const, data })));
      }
      if (mangaResults.status === 'fulfilled') {
        merged.push(...mangaResults.value.map((data) => ({ kind: 'anilist' as const, data })));
      }

      // AniList titles carry more precise match data, so they lead the list.
      const anilist = merged.filter((s) => s.kind === 'anilist');
      const tmdb = merged.filter((s) => s.kind === 'tmdb');
      setSuggestions([...anilist, ...tmdb].slice(0, 8));
    };

    run().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPopoverOpen(false);
    if (!query.trim()) return;
    // Unified search lands on the movies tab, which renders every result type.
    router.push(`/?query=${encodeURIComponent(query.trim())}&tab=all`);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setPopoverOpen(false);
    const params = new URLSearchParams(searchParams);
    params.delete('query');
    router.push(`/?${params.toString()}`);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
      <form onSubmit={handleSearch} className="relative w-full max-w-sm">
        <PopoverAnchor asChild>
          <Input
            type="search"
            placeholder="Search movies, web series, anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={() => query.length > 1 && setPopoverOpen(true)}
            className="h-9 pr-16"
            autoComplete="off"
          />
        </PopoverAnchor>

        <div className="absolute right-0 top-0 flex h-9 items-center">
          {isLoading ? (
            <Loader2 className="h-4 w-10 animate-spin text-muted-foreground" />
          ) : query ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={clearSearch}
              className="h-9 w-10 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : null}
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="h-9 w-10 text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>

        {suggestions.length > 0 && (
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col">
              {suggestions.map((item) => {
                const title = getSuggestionTitle(item);
                const imageUrl = getSuggestionImage(item);
                const kind = getSuggestionKind(item);
                const year = getSuggestionYear(item);
                const language =
                  item.kind === 'tmdb' ? languageLabel(item.data.originalLanguage) : null;

                return (
                  <Link
                    key={`${kind}-${item.data.id}`}
                    href={getSuggestionUrl(item)}
                    onClick={() => setPopoverOpen(false)}
                    className="flex items-center gap-3 p-2 transition-colors hover:bg-accent"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <TypePill kind={kind} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <TypePill kind={kind} language={language} />
                        {year && <span className="text-xs text-muted-foreground">{year}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                onMouseDown={handleSearch}
                className="rounded-t-none"
              >
                See all results for &quot;{debouncedQuery}&quot;
              </Button>
            </div>
          </PopoverContent>
        )}
      </form>
    </Popover>
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-input" />}>
      <SearchBarInternal />
    </Suspense>
  );
}
