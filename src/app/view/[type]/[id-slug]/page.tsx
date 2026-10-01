import { notFound } from 'next/navigation';
import { fetchMediaById } from '@/lib/anilist';
import type { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { toEpisode } from '@/lib/params';
import { buildMediaMetadata } from '@/lib/metadata';
import JsonLd from '@/components/json-ld';
import Viewer from '@/components/viewer';

type Props = {
  params: Promise<{
    type: 'anime' | 'manga';
    'id-slug': string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  const { 'id-slug': idSlug, type } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(idSlug.split('-')[0]);

  if (isNaN(id)) {
    return { title: 'Not Found' };
  }

  const media = await fetchMediaById(id);
  if (!media) {
    return { title: 'Not Found' };
  }

  const title = media.title.english || media.title.romaji;
  const isAnime = type === 'anime';
  const itemType = isAnime ? 'Episode' : 'Chapter';
  const itemNumber = resolvedSearchParams?.item || '1';

  return buildMediaMetadata({
    title,
    description: media.description ?? `Stream in high quality. Available in Sub and Dub.`,
    image: media.bannerImage ?? media.coverImage.extraLarge,
    path: `/view/${type}/${media.id}-${slugify(title)}${
      itemNumber !== '1' ? `?item=${itemNumber}` : ''
    }`,
    ogType: isAnime ? 'video.episode' : 'video.other',
    episodeLabel: `${itemType} ${toEpisode(resolvedSearchParams?.item)}`,
  });
}

export default async function ViewPage({ params, searchParams }: Props) {
  const { 'id-slug': idSlug, type } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(idSlug.split('-')[0], 10);
  const initialItemNumber = toEpisode(resolvedSearchParams?.item);

  if (isNaN(id) || !['anime', 'manga'].includes(type)) {
    notFound();
  }

  const media = await fetchMediaById(id);
  if (!media) {
    notFound();
  }

  const expectedSlug = slugify(media.title.english || media.title.romaji);
  const actualSlug = idSlug.substring(id.toString().length + 1);

  if (actualSlug !== expectedSlug) {
    // Redirect to canonical URL if slug is incorrect for SEO
    // This part is commented out as it requires a full redirect, which is complex for this implementation
    // For a real app, you'd use next/navigation's redirect here.
  }

  return (
    <>
      <JsonLd media={media} type={type} itemNumber={initialItemNumber} />
      <Viewer media={media} initialItemNumber={initialItemNumber} type={type} />
    </>
  );
}
