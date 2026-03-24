/**
 * Spotify Web API client using client credentials flow.
 * Returns monthly listeners (via popularity proxy), genres, and artist metadata.
 */

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  image_url: string | null;
};

/** Get artist by Spotify ID */
export async function getSpotifyArtist(artistId: string): Promise<SpotifyArtist | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();

    return {
      id: data.id,
      name: data.name,
      genres: data.genres ?? [],
      popularity: data.popularity ?? 0,
      followers: data.followers?.total ?? 0,
      image_url: data.images?.[0]?.url ?? null,
    };
  } catch {
    return null;
  }
}

/** Search for an artist by name, return the best match */
export async function searchSpotifyArtist(query: string): Promise<SpotifyArtist | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const artist = data?.artists?.items?.[0];
    if (!artist) return null;

    return {
      id: artist.id,
      name: artist.name,
      genres: artist.genres ?? [],
      popularity: artist.popularity ?? 0,
      followers: artist.followers?.total ?? 0,
      image_url: artist.images?.[0]?.url ?? null,
    };
  } catch {
    return null;
  }
}

/** Get artist from a track ID */
export async function getArtistFromTrack(trackId: string): Promise<SpotifyArtist | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const primaryArtist = data?.artists?.[0];
    if (!primaryArtist?.id) return null;

    return getSpotifyArtist(primaryArtist.id);
  } catch {
    return null;
  }
}

/** Get artist from an album ID */
export async function getArtistFromAlbum(albumId: string): Promise<SpotifyArtist | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const primaryArtist = data?.artists?.[0];
    if (!primaryArtist?.id) return null;

    return getSpotifyArtist(primaryArtist.id);
  } catch {
    return null;
  }
}
