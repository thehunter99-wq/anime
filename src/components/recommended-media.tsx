import { fetchFromAniList } from "@/lib/anilist";
import { type Media } from "@/lib/types";
import MediaCarousel from "./media-carousel";
import { getEnhancedAnimeRecommendations } from "./anime-seo-anchors";

async function RecommendedMedia({ media }: { media: Media }) {
  if (!media.genres || media.genres.length === 0) {
    return null;
  }

  // Fetch enhanced recommendations with SEO anchors
  const enhancedItems = await getEnhancedAnimeRecommendations(media, 12);

  if (enhancedItems.length === 0) {
    return null;
  }

  return (
    <MediaCarousel
      title="More Like This"
      items={enhancedItems}
    />
  );
}

export default RecommendedMedia;
