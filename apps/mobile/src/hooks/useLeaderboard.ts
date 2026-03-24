import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { LeaderboardView, TimePeriod, LeaderboardEntry } from "@/types";

export function useLeaderboard({ view, period }: { view: LeaderboardView; period: TimePeriod }) {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["leaderboard", view, period],
    queryFn: async () => {
      let dateFilter: string | null = null;
      const now = new Date();
      if (period === "weekly") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString();
      } else if (period === "monthly") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = monthAgo.toISOString();
      }

      if (view === "founders") {
        // Count founder badges per user
        let query = supabase
          .from("founder_badges")
          .select("user_id, users!inner(name, avatar_url)");

        if (dateFilter) {
          query = query.gte("awarded_at", dateFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const counts = new Map<string, { name: string; avatar_url: string | null; count: number }>();
        for (const row of data ?? []) {
          const u = Array.isArray(row.users) ? row.users[0] : row.users;
          const existing = counts.get(row.user_id);
          if (existing) {
            existing.count++;
          } else {
            counts.set(row.user_id, {
              name: (u as any)?.name ?? "User",
              avatar_url: (u as any)?.avatar_url ?? null,
              count: 1,
            });
          }
        }

        const entries: LeaderboardEntry[] = Array.from(counts.entries())
          .map(([id, info]) => ({
            rank: 0,
            fanId: id,
            name: info.name,
            avatarUrl: info.avatar_url,
            metric: info.count,
          }))
          .sort((a, b) => b.metric - a.metric)
          .map((entry, i) => ({ ...entry, rank: i + 1 }));

        return entries;
      }

      if (view === "influence") {
        // Count how many people collected items that a user founded
        const { data: founders } = await supabase
          .from("founder_badges")
          .select("user_id, item_id, users!inner(name, avatar_url)");

        if (!founders?.length) return [];

        const founderMap = new Map<string, { name: string; avatar_url: string | null; itemIds: string[] }>();
        for (const row of founders) {
          const u = Array.isArray(row.users) ? row.users[0] : row.users;
          const existing = founderMap.get(row.user_id);
          if (existing) {
            existing.itemIds.push(row.item_id);
          } else {
            founderMap.set(row.user_id, {
              name: (u as any)?.name ?? "User",
              avatar_url: (u as any)?.avatar_url ?? null,
              itemIds: [row.item_id],
            });
          }
        }

        const allItemIds = Array.from(founderMap.values()).flatMap((f) => f.itemIds);
        let collectionsQuery = supabase
          .from("collections")
          .select("item_id")
          .in("item_id", allItemIds);

        if (dateFilter) {
          collectionsQuery = collectionsQuery.gte("created_at", dateFilter);
        }

        const { data: collections } = await collectionsQuery;

        const collectionCounts = new Map<string, number>();
        for (const c of collections ?? []) {
          collectionCounts.set(c.item_id, (collectionCounts.get(c.item_id) ?? 0) + 1);
        }

        const entries: LeaderboardEntry[] = Array.from(founderMap.entries())
          .map(([id, info]) => {
            const influence = info.itemIds.reduce((sum, itemId) => sum + (collectionCounts.get(itemId) ?? 0), 0);
            return {
              rank: 0,
              fanId: id,
              name: info.name,
              avatarUrl: info.avatar_url,
              metric: influence,
            };
          })
          .filter((e) => e.metric > 0)
          .sort((a, b) => b.metric - a.metric)
          .map((entry, i) => ({ ...entry, rank: i + 1 }));

        return entries;
      }

      // trending: most collections in the last week by user
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentCollections } = await supabase
        .from("collections")
        .select("user_id, users!inner(name, avatar_url)")
        .gte("created_at", weekAgo);

      const counts = new Map<string, { name: string; avatar_url: string | null; count: number }>();
      for (const row of recentCollections ?? []) {
        const u = Array.isArray(row.users) ? row.users[0] : row.users;
        const existing = counts.get(row.user_id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(row.user_id, {
            name: (u as any)?.name ?? "User",
            avatar_url: (u as any)?.avatar_url ?? null,
            count: 1,
          });
        }
      }

      const entries: LeaderboardEntry[] = Array.from(counts.entries())
        .map(([id, info]) => ({
          rank: 0,
          fanId: id,
          name: info.name,
          avatarUrl: info.avatar_url,
          metric: info.count,
        }))
        .sort((a, b) => b.metric - a.metric)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

      return entries;
    },
    staleTime: 5 * 60 * 1000,
  });

  const entries = query.data ?? [];
  const userPosition = entries.find((e) => e.fanId === user?.id) ?? null;

  return {
    entries,
    userPosition,
    currentFanId: user?.id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
