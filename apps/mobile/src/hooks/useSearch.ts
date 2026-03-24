import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DecibelSearchResult } from "@/types";

export function useDecibelSearch(query: string) {
  return useQuery<DecibelSearchResult[]>({
    queryKey: ["decibelSearch", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, slug, photo_url, genres, collections(count)")
        .ilike("name", `%${query}%`)
        .limit(10);

      if (error) throw error;

      return (data || []).map((row) => {
        const countArr = row.collections as { count: number }[] | null;
        const fan_count = countArr?.[0]?.count ?? 0;
        const { collections: _c, ...rest } = row;
        return { ...rest, fan_count } as DecibelSearchResult;
      });
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export type UserSearchResult = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string;
};

export function useUserSearch(query: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ["userSearch", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, avatar_url, email")
        .ilike("name", `%${query}%`)
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}
