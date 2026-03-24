/**
 * URL detection and metadata scraping for the share-a-link add flow.
 * Detects platform from URL, extracts metadata (name, photo, metrics, genres).
 */

export type UrlDetection = {
  category: string;
  platform: string;
  identifier: string | null;
  type: 'artist' | 'track' | 'album' | 'unknown';
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
  apple_music_url?: string;
};

const FOUNDER_THRESHOLD = 1_000_000; // Below 1M Spotify monthly listeners = foundable

export function detectUrl(url: string): UrlDetection {
  const lower = url.toLowerCase();

  // Spotify
  if (lower.includes('open.spotify.com/artist/')) {
    const match = url.match(/artist\/([a-zA-Z0-9]+)/);
    return { category: 'music', platform: 'spotify', identifier: match?.[1] ?? null, type: 'artist' };
  }
  if (lower.includes('open.spotify.com/track/')) {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return { category: 'music', platform: 'spotify', identifier: match?.[1] ?? null, type: 'track' };
  }
  if (lower.includes('open.spotify.com/album/')) {
    const match = url.match(/album\/([a-zA-Z0-9]+)/);
    return { category: 'music', platform: 'spotify', identifier: match?.[1] ?? null, type: 'album' };
  }

  // Apple Music
  if (lower.includes('music.apple.com')) {
    if (lower.includes('/artist/')) return { category: 'music', platform: 'apple_music', identifier: null, type: 'artist' };
    if (lower.includes('/album/') || lower.includes('/song/')) return { category: 'music', platform: 'apple_music', identifier: null, type: 'track' };
    return { category: 'music', platform: 'apple_music', identifier: null, type: 'unknown' };
  }

  // SoundCloud
  if (lower.includes('soundcloud.com/')) {
    const match = url.match(/soundcloud\.com\/([^/?#]+)/);
    return { category: 'music', platform: 'soundcloud', identifier: match?.[1] ?? null, type: 'artist' };
  }

  if (lower.includes('maps.google.com') || lower.includes('goo.gl/maps') || lower.includes('maps.app.goo.gl')) {
    return { category: 'restaurants', platform: 'google_places', identifier: null, type: 'unknown' };
  }
  if (lower.includes('instagram.com/')) {
    const match = url.match(/instagram\.com\/([^/?#]+)/);
    return { category: 'fashion', platform: 'instagram', identifier: match?.[1] ?? null, type: 'unknown' };
  }

  return { category: 'unknown', platform: 'meta_scrape', identifier: null, type: 'unknown' };
}

/** Scrape Spotify page for monthly listeners and artist info */
async function scrapeSpotifyPage(url: string): Promise<{ name?: string; monthly_listeners?: number; photo_url?: string; spotify_id?: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
      return regex.exec(html)?.[1] ?? altRegex.exec(html)?.[1] ?? null;
    };

    const title = getMetaContent('og:title');
    const image = getMetaContent('og:image');
    const description = getMetaContent('og:description') ?? getMetaContent('description') ?? '';

    // Extract monthly listeners from description or body
    let monthly_listeners: number | undefined;
    const listenersMatch = description.match(/([\d,]+)\s*monthly\s*listener/i)
      ?? html.match(/([\d,]+)\s*monthly\s*listener/i);
    if (listenersMatch) {
      monthly_listeners = parseInt(listenersMatch[1].replace(/,/g, ''), 10);
    }

    const idMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
    const spotify_id = idMatch?.[1];

    // Parse name — for tracks: "Song - song and lyrics by Artist | Spotify"
    let name = title?.split(/[|–—·]/)[0].trim();
    if (title && (url.includes('/track/') || url.includes('/album/'))) {
      const byMatch = title.match(/by\s+(.+?)(?:\s*\||$)/i);
      if (byMatch) name = byMatch[1].trim();
      else {
        const dashMatch = title.match(/^.+?\s*[-–—]\s*(.+?)(?:\s*\||$)/);
        if (dashMatch) name = dashMatch[1].trim();
      }
    }

    return { name: name ?? undefined, monthly_listeners, photo_url: image ?? undefined, spotify_id };
  } catch {
    return null;
  }
}

/** Deezer API for artist search — free, no auth, returns fans + genres */
export async function scrapeDeezerArtist(query: string): Promise<{ name: string; photo_url: string | null; follower_count: number; genres: string[] } | null> {
  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=1`);
    if (!res.ok) return null;
    const data: any = await res.json();
    const artist = data?.data?.[0];
    if (!artist) return null;

    let genres: string[] = [];
    try {
      const topRes = await fetch(`https://api.deezer.com/artist/${artist.id}/top?limit=5`);
      if (topRes.ok) {
        const topData: any = await topRes.json();
        for (const track of (topData?.data ?? []).slice(0, 1)) {
          if (track.album?.id) {
            const albumRes = await fetch(`https://api.deezer.com/album/${track.album.id}`);
            if (albumRes.ok) {
              const albumData: any = await albumRes.json();
              genres = albumData?.genres?.data?.map((g: any) => g.name).filter(Boolean) ?? [];
            }
          }
        }
      }
    } catch {}

    return {
      name: artist.name,
      photo_url: artist.picture_xl || artist.picture_big || artist.picture_medium || null,
      follower_count: artist.nb_fan ?? 0,
      genres,
    };
  } catch {
    return null;
  }
}

async function scrapeMetaTags(url: string): Promise<Partial<ScrapedPreview> | null> {
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

  // --- SPOTIFY ---
  if (detection.platform === 'spotify') {
    const spotifyData = await scrapeSpotifyPage(url);
    let artistName = spotifyData?.name ?? null;
    let monthly_listeners = spotifyData?.monthly_listeners;
    let photo_url = spotifyData?.photo_url ?? null;
    let spotify_id = spotifyData?.spotify_id ?? detection.identifier ?? undefined;

    // Fallback: meta tags
    if (!artistName) {
      const meta = await scrapeMetaTags(url);
      if (meta?.name) {
        artistName = meta.name.split(/[|–—·]/)[0].trim();
        if (meta.photo_url) photo_url = meta.photo_url;
      }
    }

    if (!artistName) return null;

    // Get genres and fallback photo from Deezer
    const deezer = await scrapeDeezerArtist(artistName);
    const genres = deezer?.genres ?? [];
    if (!photo_url && deezer?.photo_url) photo_url = deezer.photo_url;

    return {
      name: artistName,
      photo_url,
      category: 'music',
      platform: 'spotify',
      genres,
      metrics: {
        monthly_listeners: monthly_listeners ?? undefined,
        follower_count: deezer?.follower_count ?? undefined,
      },
      spotify_url: detection.type === 'artist' ? url : undefined,
      spotify_id,
    };
  }

  // --- APPLE MUSIC ---
  if (detection.platform === 'apple_music') {
    const meta = await scrapeMetaTags(url);
    let artistName = meta?.name?.split(/[|–—·]/)[0].trim() ?? null;

    // For song/album pages: "Song by Artist on Apple Music"
    if (meta?.name && detection.type === 'track') {
      const byMatch = meta.name.match(/by\s+(.+?)(?:\s+on\s+Apple\s+Music|$)/i);
      if (byMatch) artistName = byMatch[1].trim();
    }

    if (!artistName) return null;

    const deezer = await scrapeDeezerArtist(artistName);

    return {
      name: deezer?.name ?? artistName,
      photo_url: deezer?.photo_url ?? meta?.photo_url ?? null,
      category: 'music',
      platform: 'apple_music',
      genres: deezer?.genres ?? [],
      metrics: { follower_count: deezer?.follower_count ?? undefined },
      apple_music_url: url,
    };
  }

  // --- SOUNDCLOUD ---
  if (detection.platform === 'soundcloud') {
    let artistName: string | null = null;

    if (detection.identifier) {
      artistName = detection.identifier.replace(/-/g, ' ');
    }
    if (!artistName) {
      const meta = await scrapeMetaTags(url);
      if (meta?.name) artistName = meta.name.split(/[|–—·]/)[0].trim();
    }
    if (!artistName) return null;

    const deezer = await scrapeDeezerArtist(artistName);

    return {
      name: deezer?.name ?? artistName,
      photo_url: deezer?.photo_url ?? null,
      category: 'music',
      platform: 'soundcloud',
      genres: deezer?.genres ?? [],
      metrics: { follower_count: deezer?.follower_count ?? undefined },
      soundcloud_url: url,
    };
  }

  // --- FALLBACK ---
  const meta = await scrapeMetaTags(url);
  if (meta?.name) {
    return {
      name: meta.name, photo_url: meta.photo_url ?? null,
      category: detection.category !== 'unknown' ? detection.category : 'music',
      platform: detection.platform, genres: [], metrics: {},
    };
  }

  return null;
}

export function isAboveThreshold(preview: ScrapedPreview): boolean {
  if (preview.metrics.monthly_listeners && preview.metrics.monthly_listeners > FOUNDER_THRESHOLD) return true;
  if (preview.metrics.follower_count && preview.metrics.follower_count > 13000) return true;
  return false;
}
