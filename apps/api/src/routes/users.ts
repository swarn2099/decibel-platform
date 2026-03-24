import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { notifyFollowed } from '../services/notifications';

export const usersRouter = Router();

// GET /api/users/me
usersRouter.get('/me', async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data });
});

// PUT /api/users/me
usersRouter.put('/me', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, avatar_url, city } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (city !== undefined) updates.city = city;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data });
});

// Resolve "me" to the authenticated user's DB id for all /:id routes
usersRouter.param('id', (req: Request, _res: Response, next, id) => {
  if (id === 'me') {
    req.params.id = (req as any).user.id;
  }
  next();
});

// GET /api/users/:id
usersRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, city, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { res.status(404).json({ error: 'User not found' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  res.json({ data });
});

// GET /api/users/:id/stats
usersRouter.get('/:id/stats', async (req: Request, res: Response) => {
  const { id } = req.params;

  const [
    { count: findsCount },
    { count: foundersCount },
    { data: myFoundedItems },
  ] = await Promise.all([
    supabase.from('collections').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('founder_badges').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('founder_badges').select('item_id').eq('user_id', id),
  ]);

  let influence = 0;
  if (myFoundedItems?.length) {
    const itemIds = myFoundedItems.map((f) => f.item_id);
    const { count } = await supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .in('item_id', itemIds);
    influence = count ?? 0;
  }

  res.json({
    data: {
      finds: findsCount ?? 0,
      founders: foundersCount ?? 0,
      influence,
    },
  });
});

// GET /api/users/:id/founds
usersRouter.get('/:id/founds', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('founder_badges')
    .select('id, item_id, awarded_at, metric_snapshot, items!inner(id, name, slug, photo_url, genres, category, monthly_listeners)')
    .eq('user_id', id)
    .order('awarded_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const founds = (data ?? []).map((row: any) => {
    const item = Array.isArray(row.items) ? row.items[0] : row.items;
    return {
      id: row.id,
      item_id: row.item_id,
      awarded_at: row.awarded_at,
      metric_snapshot: row.metric_snapshot,
      item,
    };
  });

  res.json({ data: founds });
});

// GET /api/users/:id/collections
usersRouter.get('/:id/collections', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: collections, error } = await supabase
    .from('collections')
    .select('id, item_id, created_at, collection_type, items!inner(id, name, slug, photo_url, genres, category)')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Get founder badges to mark founded items
  const { data: founderBadges } = await supabase
    .from('founder_badges')
    .select('item_id')
    .eq('user_id', id);

  const foundedItemIds = new Set((founderBadges ?? []).map((f) => f.item_id));

  const result = (collections ?? []).map((row: any) => {
    const item = Array.isArray(row.items) ? row.items[0] : row.items;
    return {
      id: row.id,
      item_id: row.item_id,
      created_at: row.created_at,
      collection_type: row.collection_type,
      is_founder: foundedItemIds.has(row.item_id),
      item,
    };
  });

  res.json({ data: result });
});

// GET /api/users/:id/passport
usersRouter.get('/:id/passport', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get all collections
  const { data: collections, error } = await supabase
    .from('collections')
    .select('id, item_id, created_at, collection_type, items!inner(id, name, slug, photo_url, genres, category)')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Get founder badges
  const { data: foundedItems } = await supabase
    .from('founder_badges')
    .select('id, item_id, awarded_at, items!inner(id, name, slug, photo_url, genres, category)')
    .eq('user_id', id);

  const foundedItemIds = new Set((foundedItems ?? []).map((f: any) => f.item_id));

  const result: any[] = [];
  const seenItemIds = new Set<string>();

  // Founded items first
  for (const row of foundedItems ?? []) {
    const item = Array.isArray((row as any).items) ? (row as any).items[0] : (row as any).items;
    if (!item || seenItemIds.has(row.item_id)) continue;
    seenItemIds.add(row.item_id);
    result.push({
      id: `founder-${row.id}`,
      item_id: row.item_id,
      created_at: row.awarded_at,
      collection_type: 'find',
      is_founder: true,
      item,
    });
  }

  // Then collections
  for (const row of collections ?? []) {
    if (seenItemIds.has(row.item_id)) continue;
    seenItemIds.add(row.item_id);
    const item = Array.isArray((row as any).items) ? (row as any).items[0] : (row as any).items;
    result.push({
      id: row.id,
      item_id: row.item_id,
      created_at: row.created_at,
      collection_type: row.collection_type,
      is_founder: foundedItemIds.has(row.item_id),
      item,
    });
  }

  res.json({ data: result });
});

// POST /api/users/:id/follow
usersRouter.post('/:id/follow', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id: targetId } = req.params;

  if (user.id === targetId) { res.status(400).json({ error: 'Cannot follow yourself' }); return; }

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: targetId,
  });

  if (error) {
    if (error.code === '23505') { res.json({ data: { success: true, already_following: true } }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  // Notify followed user (fire and forget)
  notifyFollowed(user.id, targetId as string).catch(() => {});

  res.json({ data: { success: true, already_following: false } });
});

// DELETE /api/users/:id/follow
usersRouter.delete('/:id/follow', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id: targetId } = req.params;

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data: { success: true } });
});

// GET /api/users/:id/followers
usersRouter.get('/:id/followers', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, users!fan_follows_follower_id_fkey(id, name, avatar_url)')
    .eq('following_id', id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const followers = (data ?? []).map((row: any) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return { id: u?.id, name: u?.name ?? 'User', avatar_url: u?.avatar_url };
  });

  res.json({ data: followers });
});

// GET /api/users/:id/following
usersRouter.get('/:id/following', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('follows')
    .select('following_id, users!fan_follows_following_id_fkey(id, name, avatar_url)')
    .eq('follower_id', id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const following = (data ?? []).map((row: any) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return { id: u?.id, name: u?.name ?? 'User', avatar_url: u?.avatar_url };
  });

  res.json({ data: following });
});

// GET /api/users/:id/social-counts
usersRouter.get('/:id/social-counts', async (req: Request, res: Response) => {
  const { id } = req.params;

  const [
    { count: followersCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
  ]);

  res.json({
    data: {
      followers_count: followersCount ?? 0,
      following_count: followingCount ?? 0,
    },
  });
});

// GET /api/users/:id/is-following
usersRouter.get('/:id/is-following', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id: targetId } = req.params;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle();

  res.json({ data: { is_following: !!data } });
});

// GET /api/users/search?q=<query>
usersRouter.get('/search/query', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') { res.status(400).json({ error: 'Query parameter q is required' }); return; }

  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar_url, email')
    .ilike('name', `%${q}%`)
    .limit(10);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data: data ?? [] });
});
