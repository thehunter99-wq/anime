export const INDIAN_LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  pa: 'Punjabi',
  gu: 'Gujarati',
  ur: 'Urdu',
};

export function languageLabel(code?: string | null): string | null {
  if (!code) return null;
  return INDIAN_LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

export function isIndianLanguage(code?: string | null): boolean {
  return Boolean(code && code in INDIAN_LANGUAGE_LABELS);
}
