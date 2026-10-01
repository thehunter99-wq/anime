import { notFound } from 'next/navigation';
import { fetchMovieById, getTMDBImageUrl } from '@/lib/tmdb';
import type { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { titleFromSlug } from '@/lib/params';
import Viewer from '@/components/viewer';

type Props = {
  params: Promise<{
    type: 'movie';
    'id-slug': string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { 'id-slug': idSlug } = await params;
  const id = parseInt(idSlug.split('-')[0]);

  if (isNaN(id)) {
    return { title: 'Not Found' };
  }

  const movie = await fetchMovieById(id);

  // The page is streamable regardless of TMDB, so metadata degrades to a
  // slug-derived title rather than advertising "Not Found" to social previews.
  const title = movie?.title ?? titleFromSlug(idSlug, id);
  const description = `Stream the movie ${title} in high quality.`;
  const imageUrl = movie
    ? getTMDBImageUrl(movie.backdrop_path || movie.poster_path, 'original')
    : null;

  return {
    title: `Watch ${title}`,
    description,
    openGraph: {
      title: `Watch ${title}`,
      description,
      images: imageUrl ? [imageUrl] : [],
      type: 'video.movie',
    },
  };
}

export default async function ViewPage({ params }: Props) {
  const { 'id-slug': idSlug } = await params;
  const id = parseInt(idSlug.split('-')[0], 10);
  
  if (isNaN(id)) {
    notFound();
  }

  const movie = await fetchMovieById(id);

  // As with TV: the numeric id in the URL is all the embed needs, so a TMDB
  // outage degrades the title instead of 404-ing a streamable page.
  const fallbackTitle = titleFromSlug(idSlug, id);

  // The Viewer component needs a `media` object that matches its expected props.
  // We'll adapt the `movie` object to fit the `Viewer`'s `media` prop.
  const viewerMedia = movie
    ? {
        id: movie.id,
        imdb_id: movie.imdb_id,
        title: { english: movie.title, romaji: movie.original_title },
        // The viewer doesn't use all these fields for movies, so we can stub them
        type: 'ANIME',
        episodes: 1,
        chapters: null,
        description: movie.overview,
        coverImage: { extraLarge: movie.poster_path || '', large: movie.poster_path || '' },
        bannerImage: movie.backdrop_path || null,
        startDate: { year: new Date(movie.release_date).getFullYear(), month: new Date(movie.release_date).getMonth() + 1, day: new Date(movie.release_date).getDate() },
      }
    : {
        id,
        title: { english: fallbackTitle, romaji: fallbackTitle },
        type: 'ANIME',
        episodes: 1,
        chapters: null,
        description: '',
        coverImage: { extraLarge: '', large: '' },
        bannerImage: null,
        startDate: { year: 0, month: 0, day: 0 },
      };

  return (
    <>
      <Viewer media={viewerMedia as any} initialItemNumber={1} type={'movie'} />
    </>
  );
}
