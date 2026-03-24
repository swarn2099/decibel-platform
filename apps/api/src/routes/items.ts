import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

export const itemsRouter = Router();

// GET /api/items/search?q=<query>&category=<category>
itemsRouter.get('/search', async (req: Request, res: Response) => {
  const { q, category } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  let query = supabase
    .from('items')
    .select('id, name, slug, photo_url, genres, category, collections(count)')
    .ilike('name', `%${q}%`)
    .limit(10);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  const results = (data || []).map((row: any) => {
    const countArr = row.collections as { count: number }[] | null;
    const fan_count = countArr?.[0]?.count ?? 0;
    const { collections: _c, ...rest } = row;
    return { ...rest, fan_count };
  });

  res.json({ data: results });
});

// GET /api/items/:id
itemsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { res.status(404).json({ error: 'Item not found' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  res.json({ data });
});

// GET /api/items/by-slug/:slug
itemsRouter.get('/by-slug/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { res.status(404).json({ error: 'Item not found' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  res.json({ data });
});

// GET /api/items/:id/fans
itemsRouter.get('/:id/fans', async (req: Request, res: Response) => {
  const { id } = req.params;
  const fans: any[] = [];
  const seen = new Set<string>();

  // Founder
  const { data: founderData } = await supabase
    .from('founder_badges')
    .select('awarded_at, users!inner(id, name, avatar_url)')
    .eq('item_id', id);

  for (const row of founderData ?? []) {
    const fan = Array.isArray(row.users) ? row.users[0] : row.users;
    if (fan?.id && !seen.has(fan.id)) {
      seen.add(fan.id);
      fans.push({ id: fan.id, name: fan.name ?? 'User', avatar_url: fan.avatar_url, type: 'founded', date: row.awarded_at ?? '' });
    }
  }

  // Collections
  const { data: collectionData } = await supabase
    .from('collections')
    .select('created_at, users!inner(id, name, avatar_url)')
    .eq('item_id', id);

  for (const row of collectionData ?? []) {
    const fan = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!fan?.id || seen.has(fan.id)) continue;
    seen.add(fan.id);
    fans.push({ id: fan.id, name: fan.name ?? 'User', avatar_url: fan.avatar_url, type: 'collected', date: row.created_at ?? '' });
  }

  res.json({ data: fans });
});

// GET /api/items/:id/founder
itemsRouter.get('/:id/founder', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('founder_badges')
    .select('awarded_at, user_id, metric_snapshot, users!inner(name, avatar_url)')
    .eq('item_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { res.json({ data: null }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  const u = Array.isArray(data.users) ? data.users[0] : data.users;
  res.json({
    data: {
      name: (u as any)?.name ?? null,
      avatar_url: (u as any)?.avatar_url ?? null,
      awarded_at: data.awarded_at,
      user_id: data.user_id,
      metric_snapshot: data.metric_snapshot,
    },
  });
});

// POST /api/items — create new item (with founder badge)
itemsRouter.post('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, slug, category, photo_url, bio, spotify_url, spotify_id, soundcloud_url, instagram_handle, city, genres, monthly_listeners } = req.body;

  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

  const itemSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Check if item already exists by slug
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('slug', itemSlug)
    .maybeSingle();

  if (existing) { res.status(409).json({ error: 'Item already exists', item_id: existing.id }); return; }

  // Create item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .insert({
      name,
      slug: itemSlug,
      category: category || 'music',
      photo_url: photo_url || null,
      bio: bio || null,
      spotify_url: spotify_url || null,
      spotify_id: spotify_id || null,
      soundcloud_url: soundcloud_url || null,
      instagram_handle: instagram_handle || null,
      city: city || 'Chicago',
      genres: genres || [],
      monthly_listeners: monthly_listeners || null,
    })
    .select()
    .single();

  if (itemError) { res.status(500).json({ error: itemError.message }); return; }

  // Create founder badge
  const metricSnapshot: Record<string, any> = {
    snapshot_date: new Date().toISOString().split('T')[0],
    monthly_listeners: monthly_listeners || null,
    collections_count: 0,
  };

  const { error: badgeError } = await supabase
    .from('founder_badges')
    .insert({
      user_id: user.id,
      item_id: item.id,
      metric_snapshot: metricSnapshot,
    });

  if (badgeError) { res.status(500).json({ error: badgeError.message }); return; }

  res.status(201).json({ data: item });
});
