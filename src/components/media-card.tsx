import { animeOrMangaPath } from '@/lib/routes';
import Image from 'next/image';
import Link from 'next/link';
import { type Media } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { slugify } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { getAnimeSeoAnchorByIndex } from '@/components/anime-seo-anchors';

interface MediaCardProps {
  item: Media & { seoAnchors?: string[] };
  index?: number;
}

export default function MediaCard({ item, index = 0 }: MediaCardProps) {
  const title = item.title.english || item.title.romaji;
  const isAnime = item.type === 'ANIME';
  const mediaUrl = animeOrMangaPath(item.type, item.id);
  const dynamicAnchor = item.seoAnchors?.[0] ?? getAnimeSeoAnchorByIndex(title, index, item.startDate, item.type);
  const displayTitle = item.seoAnchors ? dynamicAnchor : title;

  return (
      <Card className="group w-full overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-transparent hover:border-primary/50">
        <CardContent className="relative p-0">
          <Link href={mediaUrl} className="block aspect-[2/3] w-full" aria-label={dynamicAnchor}>
            <div className="relative h-full w-full">
              {item.coverImage.large && (
                <Image
                  src={item.coverImage.large}
                  alt={`Cover for ${title}`}
                  fill
                  className="rounded-t-lg object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  loading="lazy"
                />
              )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <Badge
                className="absolute right-2 top-2"
                variant={isAnime ? 'default' : 'secondary'}
              >
                {item.type}
              </Badge>
            </div>
          </Link>
          <div className="p-3 space-y-2">
            <Link href={mediaUrl} aria-label={dynamicAnchor}>
              <h3 className="truncate font-semibold text-foreground hover:text-primary transition-colors">{displayTitle}</h3>
            </Link>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {item.format && <span>{item.format}</span>}
              {item.startDate?.year && <><span>&bull;</span><span>{item.startDate.year}</span></>}
            </div>
            <div className="pt-1">
               <Button asChild size="sm" className="w-full" aria-label={dynamicAnchor}>
                  <Link href={mediaUrl}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {isAnime ? 'Watch Now' : 'Read Now'}
                  </Link>
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
