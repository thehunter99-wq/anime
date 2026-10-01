
import { notFound } from 'next/navigation';
import { fetchTVShowById, getTMDBImageUrl } from '@/lib/tmdb';
import type { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { toEpisode, toSeason, titleFromSlug } from '@/lib/params';
import Viewer from '@/components/viewer';

type Props = {
  params: Promise<{
    type: 'tv';
    'id-slug': string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  const { 'id-slug': idSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(idSlug.split('-')[0]);

  if (isNaN(id)) {
    return { title: 'Not Found' };
  }

  const show = await fetchTVShowById(id);
  const title = show?.name ?? titleFromSlug(idSlug, id);
  const season = resolvedSearchParams?.season || '1';
  const episode = resolvedSearchParams?.episode || '1';
  const description = `Stream season ${season} episode ${episode} of the series ${title} in high quality.`;
  const imageUrl = show
    ? getTMDBImageUrl(show.backdrop_path || show.poster_path, 'original')
    : null;

  return {
    title: `Watch ${title} S${season} E${episode}`,
    description,
    openGraph: {
      title: `Watch ${title} S${season} E${episode}`,
      description,
      images: imageUrl ? [imageUrl] : [],
      type: 'video.episode',
    },
  };
}

export default async function ViewPage({ params, searchParams }: Props) {
  const { 'id-slug': idSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(idSlug.split('-')[0], 10);
  const season = resolvedSearchParams?.season || '1';
  const episode = resolvedSearchParams?.episode || '1';
  
  if (isNaN(id)) {
    notFound();
  }

  const show = await fetchTVShowById(id);

  // The embed only needs the numeric id, which is already in the URL. If TMDB
  // is unreachable the player must still work, so fall back to a slug-derived
  // title rather than 404-ing a page the visitor can genuinely stream.
  const fallbackTitle = titleFromSlug(idSlug, id);

  const viewerMedia = show
    ? {
        id: show.id,
        imdb_id: show.imdb_id,
        title: { english: show.name, romaji: show.original_name },
        type: 'ANIME', // Viewer expects ANIME or MANGA. We can adapt.
        episodes: show.number_of_episodes || 1,
        chapters: null,
        description: show.overview,
        coverImage: { extraLarge: show.poster_path || '', large: show.poster_path || '' },
        bannerImage: show.backdrop_path || null,
        startDate: { year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 0, month: show.first_air_date ? new Date(show.first_air_date).getMonth() + 1 : 0, day: show.first_air_date ? new Date(show.first_air_date).getDate() : 0 },
        seasons: show.seasons
      }
    : {
        id,
        title: { english: fallbackTitle, romaji: fallbackTitle },
        type: 'ANIME',
        episodes: 0,
        chapters: null,
        description: '',
        coverImage: { extraLarge: '', large: '' },
        bannerImage: null,
        startDate: { year: 0, month: 0, day: 0 },
        seasons: [],
      };

  return (
    <>
      <Viewer
        media={viewerMedia as any}
        initialItemNumber={toEpisode(episode)}
        initialSeasonNumber={toSeason(season)}
        type={'tv'}
      />
    </>
  );
}
