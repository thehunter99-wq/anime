
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { type Media } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn, slugify } from '@/lib/utils';
import { AdBanner } from '@/components/ads';
import { getEmbedSources, getDownloadUrl, hasDownload } from '@/lib/embed';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


interface ViewerProps {
  media: Media;
  initialItemNumber: number;
  initialSeasonNumber?: number;
  type: 'anime' | 'manga' | 'movie' | 'tv';
}

export default function Viewer({
  media,
  initialItemNumber,
  initialSeasonNumber = 1,
  type,
}: ViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [itemNumber, setItemNumber] = useState(initialItemNumber);
  const [seasonNumber, setSeasonNumber] = useState(initialSeasonNumber);
  const [isDub, setIsDub] = useState(searchParams.get('dub') === '1');
  
  const isAnime = type === 'anime';
  const isManga = type === 'manga';
  const isMovie = type === 'movie';
  const isTv = type === 'tv';

  const mediaId = (isMovie || isTv) ? media.id : (media.imdb_id || media.id);

  const sources = getEmbedSources(type, mediaId, itemNumber, seasonNumber, isDub);
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeSource = sources[Math.min(sourceIndex, sources.length - 1)];
  const iframeSrc = activeSource?.url ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const downloadUrl = getDownloadUrl(type, mediaId, itemNumber, seasonNumber);

  useEffect(() => {
    setSourceIndex(0);
    setLoadFailed(false);
  }, [itemNumber, seasonNumber, isDub, mediaId, type]);

  const tryNextServer = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((i) => i + 1);
      setIsLoading(true);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  };

  const title = media.title.english || media.title.romaji;
  
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

  const backLink = isMovie ? `/media/movie/${media.id}-${slugify(title)}` : isTv ? `/media/tv/${media.id}-${slugify(title)}` : `/media/${type}/${media.id}-${slugify(title)}`;
  
  const itemLabel = isAnime || isTv ? 'Episode' : 'Chapter';

  return (
    <div className={cn("flex h-screen flex-col text-foreground", isManga ? 'bg-stone-100 dark:bg-stone-900' : 'bg-background')}>
       <header className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 overflow-hidden">
          <Link href={backLink} passHref>
            <Button 
              variant={isManga ? 'outline' : 'outline'} 
              size="icon" 
              aria-label="Go back to details"
              className={isManga ? 'bg-white dark:bg-stone-800' : ''}
            >
              <ArrowLeft />
            </Button>
          </Link>
          <div className="flex flex-col overflow-hidden">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
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
              <SelectTrigger className={cn("w-[150px]", isManga ? 'bg-white dark:bg-stone-800' : '')}>
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
        {hasDownload(type) && downloadUrl && (
          <Button asChild variant="outline" size="sm" className={isManga ? 'bg-white dark:bg-stone-800' : ''}>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer nofollow">
              <Download className="mr-2 h-4 w-4" />
              Download HD
            </a>
          </Button>
        )}
        </div>
      </header>

      <main className={cn('flex flex-1 items-center justify-center overflow-hidden', isManga ? '' : 'bg-black')}>
        {isLoading && (
           <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        )}
        {loadFailed && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              This server did not respond. Try another server or reload.
            </p>
            <Button onClick={tryNextServer} variant="secondary">
              Switch server
            </Button>
          </div>
        )}
        {iframeSrc && !loadFailed && (
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
      </main>

      {sources.length > 1 && (
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 pb-2">
          <span className="text-xs text-muted-foreground">Server</span>
          {sources.map((source, index) => (
            <Button
              key={source.id}
              size="sm"
              variant={index === sourceIndex ? 'default' : 'secondary'}
              onClick={() => {
                setSourceIndex(index);
                setIsLoading(true);
                setLoadFailed(false);
              }}
            >
              {source.label}
            </Button>
          ))}
        </div>
      )}

      {!isMovie && (
        <div className="container mx-auto px-4 pb-2">
          <AdBanner className="w-full overflow-hidden" />
        </div>
      )}

      {(!isMovie) && (
        <footer className="container mx-auto flex items-center justify-between p-4">
          <Button
            onClick={() => handleNavigation(itemNumber - 1)}
            disabled={itemNumber <= 1}
            variant="secondary"
             className={isManga ? 'bg-white dark:bg-stone-800' : ''}
          >
            <ChevronLeft className="mr-2" />
            Previous
          </Button>
          <Button
            onClick={() => handleNavigation(itemNumber + 1)}
            disabled={!!(totalItems && itemNumber >= totalItems)}
            variant="secondary"
             className={isManga ? 'bg-white dark:bg-stone-800' : ''}
          >
            Next
            <ChevronRight className="ml-2" />
          </Button>
        </footer>
      )}
    </div>
  );
}
