import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { generatePortfolioNotifications } from '../services/notifications';

export const notificationsRouter = Router();

// GET /api/notifications?limit=20&offset=0
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ data: data ?? [] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/notifications/unread-count
notificationsRouter.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    res.json({ data: { count: count ?? 0 } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/notifications/mark-read
notificationsRouter.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { ids } = req.body; // optional: specific IDs to mark read

    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { error } = await query;
    if (error) throw error;
    res.json({ data: { success: true } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/notifications/generate-weekly — cron endpoint
notificationsRouter.post('/generate-weekly', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const result = await generatePortfolioNotifications();
    res.json({ data: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
