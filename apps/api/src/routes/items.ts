import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { scrapeFromUrl, isAboveThreshold, detectUrl } from '../services/scraper';

export const itemsRouter = Router();

// POST /api/items/from-url — Parse a URL and return preview
itemsRouter.post('/from-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') { res.status(400).json({ error: 'url is required' }); return; }

    const preview = await scrapeFromUrl(url);
    if (!preview) { res.status(422).json({ error: 'Could not extract data from URL' }); return; }

    // Check if item already exists by name (fuzzy match)
    const { data: existing } = await supabase
      .from('items')
      .select('id, name, slug')
      .ilike('name', preview.name)
      .limit(1)
      .maybeSingle();

    let existingFounder = null;
    if (existing) {
      const { data: founder } = await supabase
        .from('founder_badges')
        .select('user_id, users!inner(name)')
        .eq('item_id', existing.id)
        .maybeSingle();
      if (founder) {
        const u = Array.isArray(founder.users) ? founder.users[0] : founder.users;
        existingFounder = { user_id: founder.user_id, username: (u as any)?.name ?? 'Unknown' };
      }
    }

    res.json({
      data: {
        preview: {
          name: preview.name,
          photo_url: preview.photo_url,
          category: preview.category,
          platform: preview.platform,
          genres: preview.genres,
          metrics: preview.metrics,
          spotify_url: preview.spotify_url,
          spotify_id: preview.spotify_id,
          soundcloud_url: preview.soundcloud_url,
          is_above_threshold: isAboveThreshold(preview),
        },
        existing_item_id: existing?.id ?? null,
        existing_item_slug: existing?.slug ?? null,
        existing_founder: existingFounder,
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

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

// GET /api/items/:id/metrics-history — monthly listeners over time
itemsRouter.get('/:id/metrics-history', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('item_metrics')
    .select('metric_date, data')
    .eq('item_id', id)
    .order('metric_date', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Also get founding snapshot from founder_badge
  const { data: badge } = await supabase
    .from('founder_badges')
    .select('awarded_at, metric_snapshot')
    .eq('item_id', id)
    .maybeSingle();

  const points: { date: string; listeners: number }[] = [];

  // Add founding point if available
  if (badge?.metric_snapshot) {
    const snap = badge.metric_snapshot as Record<string, any>;
    const listeners = snap.monthly_listeners ?? snap.follower_count ?? 0;
    if (listeners > 0) {
      points.push({ date: badge.awarded_at?.split('T')[0] ?? '', listeners });
    }
  }

  // Add metric history points
  for (const row of data ?? []) {
    const d = row.data as Record<string, any>;
    const listeners = d?.monthly_listeners ?? d?.follower_count ?? 0;
    if (listeners > 0) {
      points.push({ date: row.metric_date, listeners });
    }
  }

  res.json({ data: points });
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
