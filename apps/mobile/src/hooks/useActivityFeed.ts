import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { ActivityFeedItem } from "@/types";

const PAGE_SIZE = 20;

export function useActivityFeed() {
  const user = useAuthStore((s) => s.user);

  const query = useInfiniteQuery({
    queryKey: ["activity-feed", user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const userId = user?.id;
      if (!userId) return { items: [] as ActivityFeedItem[], has_more: false, is_fallback: false };

      // Get users I follow
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = (follows ?? []).map((f) => f.following_id);
      // Include self in feed
      const feedUserIds = [...followingIds, userId];

      if (feedUserIds.length === 0) {
        return { items: [] as ActivityFeedItem[], has_more: false, is_fallback: true };
      }

      // Get founder badges from followed users
      const { data: founderData } = await supabase
        .from("founder_badges")
        .select("id, user_id, item_id, awarded_at, users!inner(name, avatar_url), items!inner(name, slug, photo_url, genres)")
        .in("user_id", feedUserIds)
        .order("awarded_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      // Get collections from followed users
      const { data: collectionData } = await supabase
        .from("collections")
        .select("id, user_id, item_id, created_at, collection_type, users!inner(name, avatar_url), items!inner(name, slug, photo_url, genres)")
        .in("user_id", feedUserIds)
        .order("created_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const items: ActivityFeedItem[] = [];

      for (const row of founderData ?? []) {
        const u = Array.isArray(row.users) ? row.users[0] : row.users;
        const item = Array.isArray(row.items) ? row.items[0] : row.items;
        if (!u || !item) continue;
        items.push({
          id: `founder-${row.id}`,
          fan_id: row.user_id,
          fan_name: (u as any).name ?? "User",
          fan_avatar: (u as any).avatar_url,
          action: "founded",
          performer_id: row.item_id,
          performer_name: (item as any).name,
          performer_slug: (item as any).slug,
          performer_image: (item as any).photo_url,
          performer_genres: (item as any).genres,
          venue_name: null,
          timestamp: row.awarded_at,
        });
      }

      for (const row of collectionData ?? []) {
        const u = Array.isArray(row.users) ? row.users[0] : row.users;
        const item = Array.isArray(row.items) ? row.items[0] : row.items;
        if (!u || !item) continue;
        items.push({
          id: `collection-${row.id}`,
          fan_id: row.user_id,
          fan_name: (u as any).name ?? "User",
          fan_avatar: (u as any).avatar_url,
          action: row.collection_type === "find" ? "discovered" : "collected",
          performer_id: row.item_id,
          performer_name: (item as any).name,
          performer_slug: (item as any).slug,
          performer_image: (item as any).photo_url,
          performer_genres: (item as any).genres,
          venue_name: null,
          timestamp: row.created_at,
        });
      }

      // Sort by timestamp desc
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const pageItems = items.slice(0, PAGE_SIZE);

      return {
        items: pageItems,
        has_more: items.length >= PAGE_SIZE,
        is_fallback: followingIds.length === 0,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.length;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id,
  });

  const isFallback = query.data?.pages[0]?.is_fallback ?? false;

  return { ...query, isFallback };
}
