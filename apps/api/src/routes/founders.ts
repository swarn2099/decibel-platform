import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

export const foundersRouter = Router();

// POST /api/founders — found an item
foundersRouter.post('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { item_id } = req.body;

  if (!item_id) { res.status(400).json({ error: 'item_id is required' }); return; }

  // Check if already founded
  const { data: existing } = await supabase
    .from('founder_badges')
    .select('id, user_id')
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) {
    res.status(409).json({ error: 'Item already founded', founder_user_id: existing.user_id });
    return;
  }

  // Get current metrics for snapshot
  const { data: item } = await supabase
    .from('items')
    .select('monthly_listeners, follower_count')
    .eq('id', item_id)
    .single();

  const metricSnapshot: Record<string, any> = {
    snapshot_date: new Date().toISOString().split('T')[0],
    monthly_listeners: item?.monthly_listeners || null,
    spotify_followers: item?.follower_count || null,
    collections_count: 0,
  };

  const { data: badge, error } = await supabase
    .from('founder_badges')
    .insert({
      user_id: user.id,
      item_id,
      metric_snapshot: metricSnapshot,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { res.status(409).json({ error: 'Item already founded' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  res.status(201).json({ data: badge });
});

// GET /api/founders/check/:itemId
foundersRouter.get('/check/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;

  const { data, error } = await supabase
    .from('founder_badges')
    .select('id, user_id, awarded_at, users!inner(name, avatar_url)')
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }

  if (!data) {
    res.json({ data: { is_founded: false, founder: null } });
    return;
  }

  const u = Array.isArray(data.users) ? data.users[0] : data.users;
  res.json({
    data: {
      is_founded: true,
      founder: {
        user_id: data.user_id,
        name: (u as any)?.name ?? 'User',
        avatar_url: (u as any)?.avatar_url ?? null,
        awarded_at: data.awarded_at,
      },
    },
  });
});
