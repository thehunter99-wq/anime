import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://movanime.site';

function getStarElements(rating: number) {
  const fullStars = Math.floor(rating / 2);
  const hasHalf = rating % 2 >= 1;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const stars: JSX.Element[] = [];
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <svg key={`full-${i}`} width="24" height="24" viewBox="0 0 24 24" fill="#FFD700">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (hasHalf) {
    stars.push(
      <svg key="half" width="24" height="24" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="half" x2="1">
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#666" />
          </linearGradient>
        </defs>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half)" />
      </svg>
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <svg key={`empty-${i}`} width="24" height="24" viewBox="0 0 24 24" fill="#666">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return stars;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const title = searchParams.get('title') ?? 'Watch Free HD';
  const poster = searchParams.get('poster') ?? '';
  const type = searchParams.get('type') ?? 'movie';
  const rating = parseFloat(searchParams.get('rating') ?? '0');
  const quality = searchParams.get('quality') ?? 'HD';
  const year = searchParams.get('year') ?? '';

  const hasPoster = poster && poster.startsWith('http');
  const badgeText = type === 'anime' ? 'Watch Free HD' : 'Watch Free HD';
  
  const displayTitle = title.length > 45 ? title.slice(0, 42) + '...' : title;

  return new ImageResponse(
    <div style={{
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'Nunito, system-ui, sans-serif',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      overflow: 'hidden',
    }}>
      {hasPoster && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url('${poster}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35) saturate(1.2)',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'linear-gradient(90deg, rgba(15,15,26,0.95) 0%, rgba(26,26,46,0.7) 40%, rgba(22,33,62,0.3) 100%)',
          }} />
        </>
      )}
      {!hasPoster && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        }} />
      )}
      
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(255,107,53,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,212,255,0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '48px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}>
              {badgeText}
            </div>
            {quality && (
              <div style={{
                background: 'rgba(0,212,255,0.2)',
                color: '#00D4FF',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                border: '1px solid rgba(0,212,255,0.3)',
                backdropFilter: 'blur(4px)',
              }}>
                {quality}
              </div>
            )}
            {year && (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {year}
              </div>
            )}
          </div>

          <h1 style={{
            color: 'white',
            fontSize: '56px',
            fontWeight: 900,
            lineHeight: 1.15,
            margin: 0,
            textShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            maxWidth: '900px',
          }}>
            {displayTitle}
          </h1>

          {rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {getStarElements(rating)}
              </div>
              <span style={{
                color: '#FFD700',
                fontSize: '22px',
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                {rating.toFixed(1)}/10
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '16px',
                fontWeight: 500,
              }}>
                {type === 'anime' ? 'Anime' : type === 'tv' ? 'TV Series' : 'Movie'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{
            background: 'rgba(15,15,26,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF6B35">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.3px',
            }}>
              Play Now Free
            </span>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)',
            borderRadius: '16px',
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(255,107,53,0.3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              HD Stream
            </span>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 6,
        background: 'linear-gradient(90deg, #FF6B35, #FF8E53, #00D4FF, #0099FF)',
        zIndex: 5,
      }} />
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}