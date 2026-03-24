import { Router, Request, Response } from 'express';
import { calculateTasteScore, getPortfolioGrowth, updateAllItemMetrics, captureItemMetrics } from '../services/metrics';

export const metricsRouter = Router();

// GET /api/metrics/portfolio — current user's portfolio growth
metricsRouter.get('/portfolio', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const portfolio = await getPortfolioGrowth(user.id);
    const tasteScore = await calculateTasteScore(user.id);
    const bestFind = portfolio.reduce((best: any, curr: any) =>
      curr.growth_pct > (best?.growth_pct ?? -Infinity) ? curr : best
    , portfolio[0] || null);
    res.json({ data: { portfolio, taste_score: tasteScore, best_find: bestFind } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/portfolio/:userId
metricsRouter.get('/portfolio/:userId', async (req: Request, res: Response) => {
  try {
    const portfolio = await getPortfolioGrowth(req.params.userId as string);
    const tasteScore = await calculateTasteScore(req.params.userId as string);
    res.json({ data: { portfolio, taste_score: tasteScore } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/metrics/update-all — weekly cron
metricsRouter.post('/update-all', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const result = await updateAllItemMetrics();
    res.json({ data: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/metrics/capture/:itemId
metricsRouter.post('/capture/:itemId', async (req: Request, res: Response) => {
  try {
    const result = await captureItemMetrics(req.params.itemId as string);
    res.json({ data: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
