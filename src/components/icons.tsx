import type * as React from 'react';
import { SITE_NAME } from '@/lib/site';

export const AniMovieLogo = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src="/logo.png"
    alt={`${SITE_NAME} Logo`}
    {...props}
    className='h-12 w-auto'
  />
);