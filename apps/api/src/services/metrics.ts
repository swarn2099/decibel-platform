import { supabase } from './supabase';

/**
 * Capture current metrics for an item and store in item_metrics.
 * Called after founding and by the weekly update job.
 */
export async function captureItemMetrics(itemId: string) {
  const { data: item } = await supabase
    .from('items')
    .select('monthly_listeners, follower_count')
    .eq('id', itemId)
    .single();

  if (!item) return null;

  // Count collections
  const { count: collectionsCount } = await supabase
    .from('collections')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', itemId);

  const metricsData: Record<string, any> = {
    monthly_listeners: item.monthly_listeners ?? null,
    follower_count: item.follower_count ?? null,
    collections_count: collectionsCount ?? 0,
  };

  const { data, error } = await supabase
    .from('item_metrics')
    .upsert({
      item_id: itemId,
      metric_date: new Date().toISOString().split('T')[0],
      data: metricsData,
    }, { onConflict: 'item_id,metric_date' })
    .select()
    .single();

  if (error) {
    console.error(`Failed to capture metrics for item ${itemId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Run weekly metrics update for all items that have founder badges.
 */
export async function updateAllItemMetrics() {
  const { data: foundedItems } = await supabase
    .from('founder_badges')
    .select('item_id');

  if (!foundedItems?.length) return { updated: 0 };

  const uniqueItemIds = [...new Set(foundedItems.map(f => f.item_id))];
  let updated = 0;

  for (const itemId of uniqueItemIds) {
    const result = await captureItemMetrics(itemId);
    if (result) updated++;
  }

  return { updated, total: uniqueItemIds.length };
}

/**
 * Calculate taste score for a user based on their founded items' growth.
 */
export async function calculateTasteScore(userId: string): Promise<number> {
  // Get user's founded items with their metric snapshots
  const { data: founds } = await supabase
    .from('founder_badges')
    .select('item_id, metric_snapshot, awarded_at')
    .eq('user_id', userId);

  if (!founds?.length) return 0;

  let totalScore = 0;
  const scores: { itemId: string; score: number }[] = [];

  for (const found of founds) {
    const snapshot = found.metric_snapshot as Record<string, any> || {};
    const foundingListeners = snapshot.monthly_listeners ?? snapshot.follower_count ?? 0;

    if (foundingListeners <= 0) continue;

    // Get latest metrics
    const { data: latest } = await supabase
      .from('item_metrics')
      .select('data')
      .eq('item_id', found.item_id)
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentListeners = (latest?.data as any)?.monthly_listeners
      ?? (latest?.data as any)?.follower_count ?? foundingListeners;

    if (currentListeners <= 0) continue;

    // Growth weight: log of growth ratio (capped)
    const growthRatio = currentListeners / foundingListeners;
    const growthWeight = Math.min(Math.log(Math.max(growthRatio, 1)), 5);

    // Recency weight: decays over time
    const daysSinceFound = (Date.now() - new Date(found.awarded_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.max(1 - daysSinceFound / 365, 0.1);

    const itemScore = growthWeight * recencyWeight;
    scores.push({ itemId: found.item_id, score: itemScore });
  }

  // Only count top 10 best-performing finds
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, 10);
  totalScore = topScores.reduce((sum, s) => sum + s.score, 0);

  // Normalize to 0-100 range
  return Math.min(Math.round(totalScore * 10), 100);
}

/**
 * Get growth data for a user's founded items.
 */
export async function getPortfolioGrowth(userId: string) {
  const { data: founds } = await supabase
    .from('founder_badges')
    .select('item_id, metric_snapshot, awarded_at, items!inner(id, name, slug, photo_url, genres, category, monthly_listeners)')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (!founds?.length) return [];

  const portfolio = [];

  for (const found of founds) {
    const item = Array.isArray(found.items) ? found.items[0] : found.items;
    const snapshot = found.metric_snapshot as Record<string, any> || {};
    const foundingMetric = snapshot.monthly_listeners ?? snapshot.follower_count ?? 0;

    // Get latest metric
    const { data: latest } = await supabase
      .from('item_metrics')
      .select('data, metric_date')
      .eq('item_id', found.item_id)
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentMetric = (latest?.data as any)?.monthly_listeners
      ?? (latest?.data as any)?.follower_count
      ?? (item as any)?.monthly_listeners
      ?? foundingMetric;

    const growthPct = foundingMetric > 0
      ? Math.round(((currentMetric - foundingMetric) / foundingMetric) * 100)
      : 0;

    portfolio.push({
      item_id: found.item_id,
      item,
      awarded_at: found.awarded_at,
      founding_metric: foundingMetric,
      current_metric: currentMetric,
      growth_pct: growthPct,
    });
  }

  // Find best performer
  const bestFind = portfolio.reduce((best, curr) =>
    curr.growth_pct > (best?.growth_pct ?? -Infinity) ? curr : best
  , portfolio[0] || null);

  return portfolio;
}
