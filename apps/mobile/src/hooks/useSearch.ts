import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import type { DecibelSearchResult } from "@/types";

export function useDecibelSearch(query: string) {
  return useQuery<DecibelSearchResult[]>({
    queryKey: ["decibelSearch", query],
    queryFn: async () => {
      const res = await apiCall<{ data: DecibelSearchResult[] }>(
        `/api/items/search?q=${encodeURIComponent(query)}`
      );
      return res.data ?? [];
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
      const res = await apiCall<{ data: UserSearchResult[] }>(
        `/api/users/search/query?q=${encodeURIComponent(query)}`
      );
      return res.data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}
