import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type TrendingArtist = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  collector_count: number;
};

export function useTrendingArtists() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-artists"],
    queryFn: async () => {
      // Get items with most collections in the last 2 weeks
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentCollections } = await supabase
        .from("collections")
        .select("item_id")
        .gte("created_at", twoWeeksAgo);

      if (!recentCollections?.length) {
        // Fallback: get items with most total collections
        const { data: items } = await supabase
          .from("items")
          .select("id, name, slug, photo_url")
          .order("follower_count", { ascending: false, nullsFirst: false })
          .limit(10);

        return (items ?? []).map((item) => ({
          ...item,
          collector_count: 0,
        }));
      }

      const counts = new Map<string, number>();
      for (const c of recentCollections) {
        counts.set(c.item_id, (counts.get(c.item_id) ?? 0) + 1);
      }

      const topIds = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      const { data: items } = await supabase
        .from("items")
        .select("id, name, slug, photo_url")
        .in("id", topIds);

      return (items ?? []).map((item) => ({
        ...item,
        collector_count: counts.get(item.id) ?? 0,
      })) as TrendingArtist[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    artists: data ?? [],
    isLoading,
  };
}
