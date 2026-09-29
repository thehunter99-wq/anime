'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height?: number;
      width?: number;
      params?: Record<string, unknown>;
    };
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSTERRA_KEY;

let loaded = false;

function loadAdsterra() {
  if (!CLIENT || loaded || typeof window === 'undefined') return;
  loaded = true;

  if (document.getElementById('adsterra-loader')) return;

  const script = document.createElement('script');
  script.id = 'adsterra-loader';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://ssat.pro/cdn/client.js?key=${CLIENT}&format=auto`;
  document.head.appendChild(script);
}

type AdSlotProps = {
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
};

export function AdBanner({ format = 'auto', className, label }: AdSlotProps) {
  useEffect(() => {
    loadAdsterra();
  }, []);

  if (!CLIENT) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-6 w-full overflow-hidden'}
    >
      <div className="adsterra w-full" id={`adsterra-${format}`}>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${CLIENT}', format: '${format}', params: {} });`,
          }}
        />
      </div>
    </aside>
  );
}
