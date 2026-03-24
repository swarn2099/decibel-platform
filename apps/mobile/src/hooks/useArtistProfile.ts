import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Item, FounderInfo, ItemFan } from "@/types";

export function useArtistProfile(slug: string) {
  return useQuery<Item | null>({
    queryKey: ["artist", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data as Item;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useArtistFanCount(itemId: string | undefined) {
  return useQuery<number>({
    queryKey: ["artistFanCount", itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("collections")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId!);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}

export function useArtistFounder(itemId: string | undefined) {
  return useQuery<FounderInfo | null>({
    queryKey: ["artistFounder", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_badges")
        .select("awarded_at, user_id, users!inner(name, avatar_url)")
        .eq("item_id", itemId!)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      const u = Array.isArray(data.users) ? data.users[0] : data.users;
      return {
        name: (u as any)?.name ?? null,
        avatar_url: (u as any)?.avatar_url ?? null,
        awarded_at: data.awarded_at,
        user_id: data.user_id,
      };
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!itemId,
  });
}

export function useMyArtistStatus(itemId: string | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery<"founded" | "collected" | "none">({
    queryKey: ["myArtistStatus", itemId, user?.id],
    queryFn: async () => {
      const userId = user?.id;
      if (!userId || !itemId) return "none";

      // Check if founded
      const { data: founder } = await supabase
        .from("founder_badges")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", userId)
        .maybeSingle();

      if (founder) return "founded";

      // Check if collected
      const { data: collection } = await supabase
        .from("collections")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", userId)
        .maybeSingle();

      if (collection) return "collected";

      return "none";
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId && !!user?.id,
  });
}

export function useArtistFans(itemId: string | undefined) {
  return useQuery<ItemFan[]>({
    queryKey: ["artistFans", itemId],
    queryFn: async () => {
      const fans: ItemFan[] = [];
      const seen = new Set<string>();

      // Founder
      const { data: founderData } = await supabase
        .from("founder_badges")
        .select("awarded_at, users!inner(id, name, avatar_url)")
        .eq("item_id", itemId!);

      for (const row of founderData ?? []) {
        const fan = Array.isArray(row.users) ? row.users[0] : row.users;
        if (fan?.id && !seen.has(fan.id)) {
          seen.add(fan.id);
          fans.push({ id: fan.id, name: fan.name ?? "User", avatar_url: fan.avatar_url, type: "founded", date: row.awarded_at ?? "" });
        }
      }

      // Collections
      const { data: collectionData } = await supabase
        .from("collections")
        .select("created_at, users!inner(id, name, avatar_url)")
        .eq("item_id", itemId!);

      for (const row of collectionData ?? []) {
        const fan = Array.isArray(row.users) ? row.users[0] : row.users;
        if (!fan?.id || seen.has(fan.id)) continue;
        seen.add(fan.id);
        fans.push({ id: fan.id, name: fan.name ?? "User", avatar_url: fan.avatar_url, type: "collected", date: row.created_at ?? "" });
      }

      const order = { founded: 0, collected: 1, discovered: 2 };
      fans.sort((a, b) => order[a.type] - order[b.type]);

      return fans;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}
