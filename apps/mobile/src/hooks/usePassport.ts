import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export type PassportItem = {
  id: string;
  item_id: string;
  created_at: string;
  collection_type: string;
  is_founder: boolean;
  item: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genres: string[] | null;
    category: string;
  } | null;
};

export function usePassport() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["passport", user?.id],
    queryFn: async () => {
      const userId = user!.id;

      // Get all collections with item details
      const { data: collections, error } = await supabase
        .from("collections")
        .select("id, item_id, created_at, collection_type, items!inner(id, name, slug, photo_url, genres, category)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get founder badges to mark founded items
      const { data: founderBadges } = await supabase
        .from("founder_badges")
        .select("item_id")
        .eq("user_id", userId);

      const foundedItemIds = new Set((founderBadges ?? []).map((f) => f.item_id));

      // Also include founded items that may not have a collection entry
      const { data: foundedItems } = await supabase
        .from("founder_badges")
        .select("id, item_id, awarded_at, items!inner(id, name, slug, photo_url, genres, category)")
        .eq("user_id", userId);

      const result: PassportItem[] = [];
      const seenItemIds = new Set<string>();

      // First add founded items
      for (const row of foundedItems ?? []) {
        const item = Array.isArray(row.items) ? row.items[0] : row.items;
        if (!item || seenItemIds.has(row.item_id)) continue;
        seenItemIds.add(row.item_id);
        result.push({
          id: `founder-${row.id}`,
          item_id: row.item_id,
          created_at: row.awarded_at,
          collection_type: "find",
          is_founder: true,
          item: item as any,
        });
      }

      // Then add collections
      for (const row of collections ?? []) {
        if (seenItemIds.has(row.item_id)) continue;
        seenItemIds.add(row.item_id);
        const item = Array.isArray(row.items) ? row.items[0] : row.items;
        result.push({
          id: row.id,
          item_id: row.item_id,
          created_at: row.created_at,
          collection_type: row.collection_type,
          is_founder: foundedItemIds.has(row.item_id),
          item: item as any,
        });
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });
}
