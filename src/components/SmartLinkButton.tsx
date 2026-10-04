'use client';

import { useCallback } from 'react';

import { SMARTLINK_URL } from '@/config/ads';

interface SmartLinkButtonProps {
  /** The main action — called after Smartlink opens. */
  onClick: () => void;
  /** Visible label for the button. */
  children: React.ReactNode;
  /** CSS classes for the button. */
  className?: string;
  /** Smartlink opens in new tab. */
  smartlinkTarget?: string;
}

/**
 * Wraps any download / stream / server-select action with a Smartlink
 * impression tracker.
 *
 * Flow:
 *   1. Open Smartlink in new tab (Adsterra impression recorded)
 *   2. Immediately fire the real action (download / server change)
 *
 * Adsterra policy: authentic high-intent buttons (Download / Stream /
 * Play) are allowed. Fake virus alerts or forced navigation are not.
 */
export function SmartLinkButton({
  onClick,
  children,
  className,
  smartlinkTarget = '_blank',
}: SmartLinkButtonProps) {
  const handleClick = useCallback(() => {
    if (SMARTLINK_URL) {
      window.open(SMARTLINK_URL, smartlinkTarget, 'noopener,noreferrer');
    }
    onClick();
  }, [onClick, smartlinkTarget]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export default SmartLinkButton;