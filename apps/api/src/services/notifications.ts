import { supabase } from './supabase';

type NotificationInput = {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
};

export async function createNotification(input: NotificationInput) {
  const { error } = await supabase.from('notifications').insert(input);
  if (error) console.error('Failed to create notification:', error.message);
}

/** Generate notification when someone collects a founded item */
export async function notifyFounderOfCollection(collectorUserId: string, itemId: string) {
  // Find the founder of this item
  const { data: badge } = await supabase
    .from('founder_badges')
    .select('user_id')
    .eq('item_id', itemId)
    .maybeSingle();

  if (!badge || badge.user_id === collectorUserId) return; // Don't notify self

  // Get collector name and item name
  const [{ data: collector }, { data: item }] = await Promise.all([
    supabase.from('users').select('name').eq('id', collectorUserId).single(),
    supabase.from('items').select('name, slug').eq('id', itemId).single(),
  ]);

  await createNotification({
    user_id: badge.user_id,
    type: 'collection',
    title: `${collector?.name ?? 'Someone'} collected your find`,
    body: `${collector?.name ?? 'Someone'} collected ${item?.name ?? 'an artist'} that you founded.`,
    data: { collector_id: collectorUserId, item_id: itemId, item_slug: item?.slug },
  });
}

/** Generate notification when someone follows a user */
export async function notifyFollowed(followerId: string, followedUserId: string) {
  const { data: follower } = await supabase.from('users').select('name').eq('id', followerId).single();

  await createNotification({
    user_id: followedUserId,
    type: 'follow',
    title: `${follower?.name ?? 'Someone'} started following you`,
    data: { follower_id: followerId },
  });
}

/** Generate portfolio update notifications (called by weekly cron) */
export async function generatePortfolioNotifications() {
  // Get all users with founder badges
  const { data: founders } = await supabase
    .from('founder_badges')
    .select('user_id, item_id, metric_snapshot, items!inner(name, slug, monthly_listeners)')
    .order('user_id');

  if (!founders?.length) return { generated: 0 };

  const userItems = new Map<string, typeof founders>();
  for (const f of founders) {
    const existing = userItems.get(f.user_id) ?? [];
    existing.push(f);
    userItems.set(f.user_id, existing);
  }

  let generated = 0;

  for (const [userId, items] of userItems) {
    // Find items with growth
    let bestGrowth = 0;
    let bestItem: any = null;
    let grewCount = 0;

    for (const f of items) {
      const snapshot = f.metric_snapshot as Record<string, any> ?? {};
      const foundingListeners = snapshot.monthly_listeners ?? snapshot.follower_count ?? 0;
      const item = Array.isArray(f.items) ? f.items[0] : f.items;
      const current = (item as any)?.monthly_listeners ?? foundingListeners;

      if (current > foundingListeners && foundingListeners > 0) {
        grewCount++;
        const growth = ((current - foundingListeners) / foundingListeners) * 100;
        if (growth > bestGrowth) {
          bestGrowth = growth;
          bestItem = item;
        }
      }
    }

    if (grewCount > 0 && bestItem) {
      await createNotification({
        user_id: userId,
        type: 'portfolio_update',
        title: `${grewCount} of your finds grew this week`,
        body: `Best performer: ${bestItem.name} (+${Math.round(bestGrowth)}%)`,
        data: { item_slug: bestItem.slug, growth_pct: Math.round(bestGrowth) },
      });
      generated++;
    }
  }

  return { generated };
}
