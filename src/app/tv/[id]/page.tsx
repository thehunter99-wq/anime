import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { fetchTVShowById, getTMDBImageUrl } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { tvPath, watchPath, absoluteUrl } from '@/lib/routes';
import { buildDetailMetadata, buildMediaJsonLd } from '@/lib/seo';
import JsonLd from '@/components/json-ld-script';
import Header from '@/components/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import DownloadButtons from '@/components/download-buttons';
import { getDownloadUrl } from '@/lib/embed';

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 3600;

const toId = (raw: string): number => Number.parseInt(raw, 10);
const yearOf = (date: string | null | undefined): number | null =>
  date ? Number.parseInt(date.slice(0, 4), 10) || null : null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const show = await fetchTVShowById(id);
  if (!show) return { title: 'Not Found' };

  return buildDetailMetadata({
    title: show.name,
    overview: show.overview,
    year: yearOf(show.first_air_date),
    genres: show.genres?.map((g) => g.name),
    image: getTMDBImageUrl(show.backdrop_path ?? show.poster_path, 'original'),
    path: tvPath(show.id),
    siteUrl: SITE_URL,
    isSeries: true,
  });
}

export default async function TvPage({ params }: Props) {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) notFound();

  const show = await fetchTVShowById(id);
  if (!show) notFound();

  const title = show.name;
  const year = yearOf(show.first_air_date);
  const backdrop = getTMDBImageUrl(show.backdrop_path ?? show.poster_path, 'original');
  const poster = getTMDBImageUrl(show.poster_path, 'w500');

  const jsonLd = buildMediaJsonLd({
    type: 'TVSeries',
    title,
    description: show.overview,
    image: backdrop ?? undefined,
    url: absoluteUrl(tvPath(show.id), SITE_URL),
    datePublished: show.first_air_date || null,
    genres: show.genres?.map((g) => g.name),
    numberOfSeasons: show.number_of_seasons ?? null,
    numberOfEpisodes: show.number_of_episodes ?? null,
    // Omitted until ratings are visible on the page. See src/lib/seo.ts.
    rating: null,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {backdrop && (
          <Image
            src={backdrop}
            alt={`Backdrop for ${title}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      <main className="container relative z-10 mx-auto -mt-32 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          {poster && (
            <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:w-52">
              <Image
                src={poster}
                alt={`${title} poster`}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {year && <Badge variant="secondary">{year}</Badge>}
                {show.number_of_seasons ? (
                  <Badge variant="outline">{show.number_of_seasons} Seasons</Badge>
                ) : null}
                <Badge variant="outline">HD</Badge>
                <span>
                  {SITE_NAME} &middot; Free streaming
                </span>
              </div>
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.slice(0, 4).map((genre) => (
                  <Badge key={genre.id} variant="outline">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}

            {show.overview && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {show.overview}
              </p>
            )}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={`${watchPath('tv', show.id)}?season=1&episode=1`}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {title} Season 1 Episode 1
              </a>
            </Button>

            <DownloadButtons
              directUrl={getDownloadUrl('tv', show.id, 1, 1)}
              episodeLabel="S1 E1"
              isManga={false}
            />

            <AdSlot className="mt-2" />
          </div>
        </div>
      </main>

      <JsonLd data={jsonLd} />
    </div>
  );
}