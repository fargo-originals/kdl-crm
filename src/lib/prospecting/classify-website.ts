const SOCIAL_DOMAINS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  'linkedin.com': 'LinkedIn',
  'youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'tripadvisor.com': 'TripAdvisor',
  'yelp.com': 'Yelp',
  'google.com': 'Google Maps',
  'maps.google.com': 'Google Maps',
};

export type WebPresence = 'real_website' | 'social_only' | 'none';

export type WebInfo = {
  presence: WebPresence;
  label: string;
  url: string | null;
};

export function classifyWebsite(website: string | null): WebInfo {
  if (!website) return { presence: 'none', label: 'Sin web', url: null };

  try {
    const hostname = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
    const social = SOCIAL_DOMAINS[hostname];
    if (social) return { presence: 'social_only', label: social, url: website };
    return { presence: 'real_website', label: 'Web propia', url: website };
  } catch {
    return { presence: 'none', label: 'Sin web', url: null };
  }
}
