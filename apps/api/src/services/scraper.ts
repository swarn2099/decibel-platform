/**
 * URL detection and metadata scraping for the share-a-link add flow.
 * Routes to platform-specific APIs first (free), AI classification as fallback.
 */
import { getSpotifyArtist, getArtistFromTrack, getArtistFromAlbum, searchSpotifyArtist } from './spotify';
import { scrapeInstagramProfile, cleanInstagramName } from './instagram';
import { classifyEntity, UNDERGROUND_THRESHOLD } from './classify';

export type UrlDetection = {
  category: string;
  platform: string;
  identifier: string | null;
  type: 'artist' | 'track' | 'album' | 'profile' | 'unknown';
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
    popularity?: number;
    underground_score?: number;
  };
  spotify_url?: string;
  spotify_id?: string;
  soundcloud_url?: string;
  apple_music_url?: string;
  instagram_handle?: string;
};

export function detectUrl(url: string): UrlDetection {
  const lower = url.toLowerCase();

  // Spotify
  if (lower.includes('open.spotify.com/artist/')) {
    return { category: 'music', platform: 'spotify', identifier: url.match(/artist\/([a-zA-Z0-9]+)/)?.[1] ?? null, type: 'artist' };
  }
  if (lower.includes('open.spotify.com/track/')) {
    return { category: 'music', platform: 'spotify', identifier: url.match(/track\/([a-zA-Z0-9]+)/)?.[1] ?? null, type: 'track' };
  }
  if (lower.includes('open.spotify.com/album/')) {
    return { category: 'music', platform: 'spotify', identifier: url.match(/album\/([a-zA-Z0-9]+)/)?.[1] ?? null, type: 'album' };
  }
  if (lower.includes('open.spotify.com/show/') || lower.includes('open.spotify.com/episode/')) {
    return { category: 'podcast', platform: 'spotify', identifier: url.match(/(?:show|episode)\/([a-zA-Z0-9]+)/)?.[1] ?? null, type: 'unknown' };
  }

  // Apple Music
  if (lower.includes('music.apple.com')) {
    if (lower.includes('/artist/')) return { category: 'music', platform: 'apple_music', identifier: null, type: 'artist' };
    return { category: 'music', platform: 'apple_music', identifier: null, type: 'track' };
  }

  // SoundCloud
  if (lower.includes('soundcloud.com/')) {
    return { category: 'music', platform: 'soundcloud', identifier: url.match(/soundcloud\.com\/([^/?#]+)/)?.[1] ?? null, type: 'artist' };
  }

  // TikTok
  if (lower.includes('tiktok.com/@') || lower.includes('tiktok.com/')) {
    const handle = url.match(/tiktok\.com\/@([^/?#]+)/)?.[1] ?? url.match(/tiktok\.com\/([^/?#]+)/)?.[1];
    return { category: 'other', platform: 'tiktok', identifier: handle ?? null, type: 'profile' };
  }

  // Instagram
  if (lower.includes('instagram.com/')) {
    const handle = url.match(/instagram\.com\/([^/?#]+)/)?.[1];
    if (handle && !['p', 'reel', 'stories', 'explore'].includes(handle)) {
      return { category: 'other', platform: 'instagram', identifier: handle, type: 'profile' };
    }
    return { category: 'other', platform: 'instagram', identifier: handle ?? null, type: 'unknown' };
  }

  // Google Maps / Places
  if (lower.includes('maps.google.com') || lower.includes('goo.gl/maps') || lower.includes('maps.app.goo.gl') || lower.includes('google.com/maps')) {
    return { category: 'restaurant', platform: 'google_places', identifier: null, type: 'unknown' };
  }

  // Etsy / Shopify
  if (lower.includes('etsy.com/shop/')) {
    return { category: 'fashion', platform: 'etsy', identifier: url.match(/shop\/([^/?#]+)/)?.[1] ?? null, type: 'profile' };
  }
  if (lower.includes('.myshopify.com') || lower.match(/shopify/)) {
    return { category: 'fashion', platform: 'shopify', identifier: null, type: 'profile' };
  }

  // Product Hunt
  if (lower.includes('producthunt.com/posts/')) {
    return { category: 'tech', platform: 'producthunt', identifier: url.match(/posts\/([^/?#]+)/)?.[1] ?? null, type: 'unknown' };
  }

  return { category: 'unknown', platform: 'meta_scrape', identifier: null, type: 'unknown' };
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

/** Scrape generic page meta tags */
async function scrapeMetaTags(url: string): Promise<{ name?: string; photo_url?: string; description?: string } | null> {
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

    const rawName = getMetaContent('og:title') ?? getMetaContent('title');
    return {
      name: rawName ? decodeEntities(rawName) : undefined,
      photo_url: getMetaContent('og:image') ?? undefined,
      description: decodeEntities(getMetaContent('og:description') ?? getMetaContent('description') ?? ''),
    };
  } catch {
    return null;
  }
}

/** Deezer API for fallback artist search */
async function scrapeDeezerArtist(query: string): Promise<{ name: string; photo_url: string | null; follower_count: number; genres: string[] } | null> {
  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=1`);
    if (!res.ok) return null;
    const data: any = await res.json();
    const artist = data?.data?.[0];
    if (!artist) return null;

    let genres: string[] = [];
    try {
      const topRes = await fetch(`https://api.deezer.com/artist/${artist.id}/top?limit=3`);
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

    return { name: artist.name, photo_url: artist.picture_xl || artist.picture_big || null, follower_count: artist.nb_fan ?? 0, genres };
  } catch {
    return null;
  }
}

// ─── Main scraper ───────────────────────────────────────────────

export async function scrapeFromUrl(url: string): Promise<ScrapedPreview | null> {
  const detection = detectUrl(url);

  // ─── SPOTIFY (music) ───
  if (detection.platform === 'spotify' && detection.category === 'music' && detection.identifier) {
    let spotifyArtist = null;
    if (detection.type === 'artist') spotifyArtist = await getSpotifyArtist(detection.identifier);
    else if (detection.type === 'track') spotifyArtist = await getArtistFromTrack(detection.identifier);
    else if (detection.type === 'album') spotifyArtist = await getArtistFromAlbum(detection.identifier);

    if (spotifyArtist) {
      return {
        name: spotifyArtist.name,
        photo_url: spotifyArtist.image_url,
        category: 'music',
        platform: 'spotify',
        genres: spotifyArtist.genres,
        metrics: { monthly_listeners: spotifyArtist.followers, follower_count: spotifyArtist.followers, popularity: spotifyArtist.popularity },
        spotify_url: `https://open.spotify.com/artist/${spotifyArtist.id}`,
        spotify_id: spotifyArtist.id,
      };
    }
  }

  // ─── APPLE MUSIC ───
  if (detection.platform === 'apple_music') {
    const meta = await scrapeMetaTags(url);
    let artistName = meta?.name?.split(/[|\u2013\u2014\xb7]/)[0].trim() ?? null;
    if (meta?.name && detection.type === 'track') {
      const byMatch = meta.name.match(/by\s+(.+?)(?:\s+on\s+Apple\s+Music|$)/i);
      if (byMatch) artistName = byMatch[1].trim();
    }
    if (!artistName) return null;

    const [spotifyMatch, deezer] = await Promise.all([searchSpotifyArtist(artistName), scrapeDeezerArtist(artistName)]);

    return {
      name: spotifyMatch?.name ?? deezer?.name ?? artistName,
      photo_url: spotifyMatch?.image_url ?? deezer?.photo_url ?? meta?.photo_url ?? null,
      category: 'music', platform: 'apple_music',
      genres: spotifyMatch?.genres ?? deezer?.genres ?? [],
      metrics: { monthly_listeners: spotifyMatch?.followers, follower_count: deezer?.follower_count, popularity: spotifyMatch?.popularity },
      apple_music_url: url,
      spotify_url: spotifyMatch ? `https://open.spotify.com/artist/${spotifyMatch.id}` : undefined,
      spotify_id: spotifyMatch?.id,
    };
  }

  // ─── SOUNDCLOUD ───
  if (detection.platform === 'soundcloud') {
    let artistName = detection.identifier?.replace(/-/g, ' ') ?? null;
    if (!artistName) { const meta = await scrapeMetaTags(url); artistName = meta?.name?.split(/[|\u2013\u2014]/)[0].trim() ?? null; }
    if (!artistName) return null;

    const [spotifyMatch, deezer] = await Promise.all([searchSpotifyArtist(artistName), scrapeDeezerArtist(artistName)]);

    return {
      name: spotifyMatch?.name ?? deezer?.name ?? artistName,
      photo_url: spotifyMatch?.image_url ?? deezer?.photo_url ?? null,
      category: 'music', platform: 'soundcloud',
      genres: spotifyMatch?.genres ?? deezer?.genres ?? [],
      metrics: { monthly_listeners: spotifyMatch?.followers, follower_count: deezer?.follower_count, popularity: spotifyMatch?.popularity },
      soundcloud_url: url,
      spotify_url: spotifyMatch ? `https://open.spotify.com/artist/${spotifyMatch.id}` : undefined,
      spotify_id: spotifyMatch?.id,
    };
  }

  // ─── INSTAGRAM (fashion, art, brands) ───
  if (detection.platform === 'instagram' && detection.identifier) {
    const profile = await scrapeInstagramProfile(detection.identifier);
    if (profile) {
      // Use AI to classify category
      const classification = await classifyEntity({
        name: profile.name,
        platform: 'instagram',
        followerCount: profile.followers,
        description: profile.bio ?? undefined,
      });

      return {
        name: classification.name ?? profile.name,
        photo_url: profile.photo_url,
        category: classification.category,
        platform: 'instagram',
        genres: [],
        metrics: { follower_count: profile.followers, underground_score: classification.score },
        instagram_handle: profile.handle,
      };
    }

    // Fallback: meta tags + AI
    const meta = await scrapeMetaTags(url);
    const cleanedName = meta?.name ? cleanInstagramName(meta.name) : null;

    // Final fallback: use the handle as the name (capitalize it)
    const finalName = cleanedName || detection.identifier!.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const classification = await classifyEntity({
      name: finalName,
      platform: 'instagram',
      description: meta?.description,
    });

    // Try Clearbit for a logo
    let photo = meta?.photo_url ?? null;
    if (!photo) {
      try {
        const brandSlug = finalName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const clearbitUrl = `https://logo.clearbit.com/${brandSlug}.com`;
        const logoRes = await fetch(clearbitUrl, { method: 'HEAD', redirect: 'follow' });
        if (logoRes.ok) photo = clearbitUrl;
      } catch {}
    }

    return {
      name: classification.name ?? finalName,
      photo_url: photo,
      category: classification.category,
      platform: 'instagram',
      genres: [],
      metrics: { underground_score: classification.score },
      instagram_handle: detection.identifier,
    };
  }

  // ─── TIKTOK ───
  if (detection.platform === 'tiktok') {
    const meta = await scrapeMetaTags(url);
    const name = meta?.name?.split(/[|\u2013\u2014]/)[0].trim() ?? detection.identifier ?? null;
    if (!name) return null;

    const classification = await classifyEntity({ name, platform: 'tiktok', description: meta?.description });

    return {
      name: classification.name ?? name,
      photo_url: meta?.photo_url ?? null,
      category: classification.category,
      platform: 'tiktok',
      genres: [],
      metrics: { underground_score: classification.score },
    };
  }

  // ─── GOOGLE MAPS (restaurants) ───
  if (detection.platform === 'google_places') {
    const meta = await scrapeMetaTags(url);
    if (meta?.name) {
      const name = meta.name.split(/[|\u2013\u2014]/)[0].replace(/- Google Maps$/i, '').trim();
      const classification = await classifyEntity({ name, category: 'restaurant', platform: 'google_maps', description: meta.description });

      return {
        name: classification.name ?? name,
        photo_url: meta.photo_url ?? null,
        category: 'restaurant',
        platform: 'google_maps',
        genres: [],
        metrics: { underground_score: classification.score },
      };
    }
  }

  // ─── ETSY / SHOPIFY (fashion) ───
  if (detection.platform === 'etsy' || detection.platform === 'shopify') {
    const meta = await scrapeMetaTags(url);
    if (meta?.name) {
      const name = meta.name.split(/[|\u2013\u2014]/)[0].trim();
      const classification = await classifyEntity({ name, category: 'fashion', platform: detection.platform, description: meta.description });

      return {
        name: classification.name ?? name,
        photo_url: meta.photo_url ?? null,
        category: classification.category,
        platform: detection.platform,
        genres: [],
        metrics: { underground_score: classification.score },
      };
    }
  }

  // ─── GENERIC FALLBACK — scrape + AI classify ───
  const meta = await scrapeMetaTags(url);
  if (meta?.name) {
    const name = meta.name.split(/[|\u2013\u2014]/)[0].trim();
    const classification = await classifyEntity({ name, platform: detection.platform, description: meta.description });

    return {
      name: classification.name ?? name,
      photo_url: meta.photo_url ?? null,
      category: classification.category,
      platform: detection.platform,
      genres: [],
      metrics: { underground_score: classification.score },
    };
  }

  return null;
}

export function isAboveThreshold(preview: ScrapedPreview): boolean {
  // AI underground score (used for non-music categories)
  if (preview.metrics.underground_score != null && preview.metrics.underground_score > UNDERGROUND_THRESHOLD) return true;
  // Spotify popularity > 65 (music)
  if (preview.metrics.popularity && preview.metrics.popularity > 65) return true;
  // Spotify followers > 500K (music)
  if (preview.metrics.monthly_listeners && preview.metrics.monthly_listeners > 500_000) return true;
  // Deezer fans > 13K (music fallback)
  if (preview.metrics.follower_count && preview.metrics.follower_count > 13000 && !preview.metrics.monthly_listeners) return true;
  return false;
}
