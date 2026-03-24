import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

export const feedRouter = Router();

// GET /api/feed?page=0&category=all
feedRouter.get('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = parseInt(req.query.page as string) || 0;
  const category = req.query.category as string;
  const PAGE_SIZE = 20;

  // Get users I follow
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  const feedUserIds = [...followingIds, user.id];
  const isFallback = followingIds.length === 0;

  // If not following anyone, show global feed
  const targetUserIds = isFallback ? undefined : feedUserIds;

  // Get founder badges
  let founderQuery = supabase
    .from('founder_badges')
    .select('id, user_id, item_id, awarded_at, users!inner(name, avatar_url), items!inner(name, slug, photo_url, genres, category)')
    .order('awarded_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (targetUserIds) {
    founderQuery = founderQuery.in('user_id', targetUserIds);
  }

  // Get collections
  let collectionQuery = supabase
    .from('collections')
    .select('id, user_id, item_id, created_at, collection_type, users!inner(name, avatar_url), items!inner(name, slug, photo_url, genres, category)')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (targetUserIds) {
    collectionQuery = collectionQuery.in('user_id', targetUserIds);
  }

  const [{ data: founderData }, { data: collectionData }] = await Promise.all([founderQuery, collectionQuery]);

  const items: any[] = [];

  for (const row of founderData ?? []) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    const item = Array.isArray(row.items) ? row.items[0] : row.items;
    if (!u || !item) continue;
    // Category filter
    if (category && category !== 'all' && (item as any).category !== category) continue;
    items.push({
      id: `founder-${row.id}`,
      fan_id: row.user_id,
      fan_name: (u as any).name ?? 'User',
      fan_avatar: (u as any).avatar_url,
      action: 'founded',
      performer_id: row.item_id,
      performer_name: (item as any).name,
      performer_slug: (item as any).slug,
      performer_image: (item as any).photo_url,
      performer_genres: (item as any).genres,
      performer_category: (item as any).category,
      venue_name: null,
      timestamp: row.awarded_at,
    });
  }

  for (const row of collectionData ?? []) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    const item = Array.isArray(row.items) ? row.items[0] : row.items;
    if (!u || !item) continue;
    if (category && category !== 'all' && (item as any).category !== category) continue;
    items.push({
      id: `collection-${row.id}`,
      fan_id: row.user_id,
      fan_name: (u as any).name ?? 'User',
      fan_avatar: (u as any).avatar_url,
      action: row.collection_type === 'find' ? 'discovered' : 'collected',
      performer_id: row.item_id,
      performer_name: (item as any).name,
      performer_slug: (item as any).slug,
      performer_image: (item as any).photo_url,
      performer_genres: (item as any).genres,
      performer_category: (item as any).category,
      venue_name: null,
      timestamp: row.created_at,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pageItems = items.slice(0, PAGE_SIZE);

  res.json({
    data: {
      items: pageItems,
      has_more: items.length >= PAGE_SIZE,
      is_fallback: isFallback,
    },
  });
});

// GET /api/feed/trending
feedRouter.get('/trending', async (_req: Request, res: Response) => {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentCollections } = await supabase
    .from('collections')
    .select('item_id')
    .gte('created_at', twoWeeksAgo);

  if (!recentCollections?.length) {
    const { data: items } = await supabase
      .from('items')
      .select('id, name, slug, photo_url, category')
      .order('follower_count', { ascending: false, nullsFirst: false })
      .limit(10);

    res.json({ data: (items ?? []).map((item) => ({ ...item, collector_count: 0 })) });
    return;
  }

  const counts = new Map<string, number>();
  for (const c of recentCollections) {
    counts.set(c.item_id, (counts.get(c.item_id) ?? 0) + 1);
  }

  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: items } = await supabase
    .from('items')
    .select('id, name, slug, photo_url, category')
    .in('id', topIds);

  const result = (items ?? []).map((item) => ({
    ...item,
    collector_count: counts.get(item.id) ?? 0,
  }));

  result.sort((a, b) => b.collector_count - a.collector_count);

  res.json({ data: result });
});
