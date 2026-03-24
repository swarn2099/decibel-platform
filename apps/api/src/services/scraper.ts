/**
 * URL detection and metadata scraping for the share-a-link add flow.
 * Detects platform from URL, extracts metadata (name, photo, metrics).
 */

export type UrlDetection = {
  category: string;
  platform: string;
  identifier: string | null;
};

export type ScrapedPreview = {
  name: string;
  photo_url: string | null;
  category: string;
  platform: string;
  genres: string[];
  metrics: {
    monthly_listeners?: number;
    follower_count?: number;
  };
  spotify_url?: string;
  spotify_id?: string;
  soundcloud_url?: string;
};

const FOUNDER_THRESHOLD = 13000; // Deezer fans — below this = foundable

export function detectUrl(url: string): UrlDetection {
  const lower = url.toLowerCase();

  if (lower.includes('open.spotify.com/artist/')) {
    const match = url.match(/artist\/([a-zA-Z0-9]+)/);
    return { category: 'music', platform: 'spotify', identifier: match?.[1] ?? null };
  }
  if (lower.includes('music.apple.com') && lower.includes('/artist/')) {
    return { category: 'music', platform: 'apple_music', identifier: null };
  }
  if (lower.includes('soundcloud.com/')) {
    const match = url.match(/soundcloud\.com\/([^/?#]+)/);
    return { category: 'music', platform: 'soundcloud', identifier: match?.[1] ?? null };
  }
  if (lower.includes('maps.google.com') || lower.includes('goo.gl/maps') || lower.includes('maps.app.goo.gl')) {
    return { category: 'restaurants', platform: 'google_places', identifier: null };
  }
  if (lower.includes('instagram.com/')) {
    const match = url.match(/instagram\.com\/([^/?#]+)/);
    return { category: 'fashion', platform: 'instagram', identifier: match?.[1] ?? null };
  }

  return { category: 'unknown', platform: 'meta_scrape', identifier: null };
}

export async function scrapeDeezerArtist(query: string): Promise<ScrapedPreview | null> {
  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=1`);
    if (!res.ok) return null;
    const data: any = await res.json();
    const artist = data?.data?.[0];
    if (!artist) return null;

    return {
      name: artist.name,
      photo_url: artist.picture_xl || artist.picture_big || artist.picture_medium || null,
      category: 'music',
      platform: 'deezer',
      genres: [],
      metrics: { follower_count: artist.nb_fan ?? 0 },
    };
  } catch {
    return null;
  }
}

export async function scrapeMetaTags(url: string): Promise<Partial<ScrapedPreview> | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Decibel/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
      return regex.exec(html)?.[1] ?? altRegex.exec(html)?.[1] ?? null;
    };

    const title = getMetaContent('og:title') ?? getMetaContent('title');
    const image = getMetaContent('og:image');
    if (!title) return null;

    return { name: title, photo_url: image ?? null, genres: [], metrics: {} };
  } catch {
    return null;
  }
}

export async function scrapeFromUrl(url: string): Promise<ScrapedPreview | null> {
  const detection = detectUrl(url);

  if (detection.platform === 'spotify' || detection.platform === 'apple_music' || detection.platform === 'soundcloud') {
    let artistName: string | null = null;

    if (detection.platform === 'soundcloud' && detection.identifier) {
      artistName = detection.identifier.replace(/-/g, ' ');
    }

    if (!artistName) {
      const meta = await scrapeMetaTags(url);
      if (meta?.name) {
        artistName = meta.name.split(/[|–—·]/)[0].trim();
      }
    }

    if (artistName) {
      const deezerResult = await scrapeDeezerArtist(artistName);
      if (deezerResult) {
        if (detection.platform === 'spotify') { deezerResult.spotify_url = url; deezerResult.spotify_id = detection.identifier ?? undefined; }
        if (detection.platform === 'soundcloud') deezerResult.soundcloud_url = url;
        return deezerResult;
      }
    }

    const meta = await scrapeMetaTags(url);
    if (meta?.name) {
      return {
        name: meta.name, photo_url: meta.photo_url ?? null, category: 'music', platform: detection.platform, genres: [], metrics: {},
        ...(detection.platform === 'spotify' ? { spotify_url: url, spotify_id: detection.identifier ?? undefined } : {}),
        ...(detection.platform === 'soundcloud' ? { soundcloud_url: url } : {}),
      };
    }
  }

  const meta = await scrapeMetaTags(url);
  if (meta?.name) {
    return { name: meta.name, photo_url: meta.photo_url ?? null, category: detection.category !== 'unknown' ? detection.category : 'music', platform: detection.platform, genres: [], metrics: {} };
  }

  return null;
}

export function isAboveThreshold(preview: ScrapedPreview): boolean {
  return (preview.metrics.follower_count ?? 0) > FOUNDER_THRESHOLD;
}
