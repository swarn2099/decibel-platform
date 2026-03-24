import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { notifyFounderOfCollection } from '../services/notifications';

export const collectionsRouter = Router();

// POST /api/collections
collectionsRouter.post('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { item_id } = req.body;

  if (!item_id) { res.status(400).json({ error: 'item_id is required' }); return; }

  // Check if already collected
  const { data: existing } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) {
    res.json({ data: { success: true, already_collected: true } });
    return;
  }

  const { error } = await supabase.from('collections').insert({
    user_id: user.id,
    item_id,
    capture_method: 'online',
    verified: true,
    collection_type: 'stamp',
  });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Notify founder (fire and forget)
  notifyFounderOfCollection(user.id, item_id).catch(() => {});

  res.status(201).json({ data: { success: true, already_collected: false } });
});

// DELETE /api/collections/:id
collectionsRouter.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data: { success: true } });
});

// DELETE /api/collections/by-item/:itemId — uncollect by item ID
collectionsRouter.delete('/by-item/:itemId', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { itemId } = req.params;

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', user.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ data: { success: true } });
});

// GET /api/collections/my-ids
collectionsRouter.get('/my-ids', async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { data, error } = await supabase
    .from('collections')
    .select('item_id')
    .eq('user_id', user.id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const ids = (data ?? []).map((row: { item_id: string }) => row.item_id);
  res.json({ data: ids });
});
