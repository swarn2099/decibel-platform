/**
 * Instagram meta tag scraping for follower counts and profile info.
 * Free, no API key needed — extracts from page HTML meta tags.
 */

/** Decode HTML entities like &#064; &#x2022; &amp; etc. */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extract clean name from Instagram page title */
export function cleanInstagramName(rawTitle: string): string {
  const decoded = decodeHtmlEntities(rawTitle);
  // "Le Creuset (@lecreuset) • Instagram photos and videos" → "Le Creuset"
  const nameMatch = decoded.match(/^(.+?)\s*\(@/);
  if (nameMatch) return nameMatch[1].trim();
  // Fallback: remove "• Instagram photos and videos"
  return decoded.replace(/\s*[•·]\s*Instagram.*$/i, '').trim();
}

export type InstagramProfile = {
  name: string;
  handle: string;
  followers: number;
  bio: string | null;
  photo_url: string | null;
};

export async function scrapeInstagramProfile(handleOrUrl: string): Promise<InstagramProfile | null> {
  const handle = handleOrUrl.includes('instagram.com/')
    ? handleOrUrl.match(/instagram\.com\/([^/?#]+)/)?.[1]
    : handleOrUrl.replace('@', '');

  if (!handle) return null;

  try {
    const url = `https://www.instagram.com/${handle}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
      return regex.exec(html)?.[1] ?? altRegex.exec(html)?.[1] ?? null;
    };

    const title = getMetaContent('og:title') ?? '';
    const description = getMetaContent('og:description') ?? getMetaContent('description') ?? '';
    const image = getMetaContent('og:image');

    const name = cleanInstagramName(title) || handle;

    // Extract followers from description: "123K Followers, 45 Following, 67 Posts"
    let followers = 0;
    const followersMatch = description.match(/([\d,.]+[KMB]?)\s*Followers/i);
    if (followersMatch) {
      followers = parseCount(followersMatch[1]);
    }

    // Extract bio — usually after the follower/following/posts line
    const bioMatch = description.match(/Posts\s*[-\u2013\u2014]\s*(.+)/i)
      ?? description.match(/posts\.\s*(.+)/i);
    const bio = bioMatch?.[1]?.trim() ?? null;

    return { name, handle, followers, bio, photo_url: image ?? null };
  } catch {
    return null;
  }
}

function parseCount(str: string): number {
  const cleaned = str.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  if (cleaned.endsWith('B') || cleaned.endsWith('b')) return Math.round(num * 1_000_000_000);
  if (cleaned.endsWith('M') || cleaned.endsWith('m')) return Math.round(num * 1_000_000);
  if (cleaned.endsWith('K') || cleaned.endsWith('k')) return Math.round(num * 1_000);
  return Math.round(num) || 0;
}
