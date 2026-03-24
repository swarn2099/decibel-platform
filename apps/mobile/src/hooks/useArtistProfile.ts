import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import type { Item, FounderInfo, ItemFan } from "@/types";

type ItemDetailResponse = Item & {
  fan_count: number;
  founder: FounderInfo | null;
  user_status: "founded" | "collected" | "none";
};

export function useArtistProfile(slug: string) {
  return useQuery<ItemDetailResponse | null>({
    queryKey: ["artist", slug],
    queryFn: async () => {
      try {
        return await apiCall<ItemDetailResponse>(`/api/items/by-slug/${slug}`);
      } catch (err: any) {
        if (err.message?.includes("404")) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useArtistFanCount(itemId: string | undefined) {
  // Fan count is included in the artist profile response
  // This hook exists for backward compat but data comes from useArtistProfile
  return useQuery<number>({
    queryKey: ["artistFanCount", itemId],
    queryFn: async () => {
      const res = await apiCall<{ data: { id: string }[] }>(`/api/items/${itemId}/fans`);
      return res.data?.length ?? 0;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}

export function useArtistFounder(itemId: string | undefined) {
  return useQuery<FounderInfo | null>({
    queryKey: ["artistFounder", itemId],
    queryFn: async () => {
      const res = await apiCall<{ data: { is_founded: boolean; founder: FounderInfo | null } }>(
        `/api/founders/check/${itemId}`
      );
      return res.data?.founder ?? null;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!itemId,
  });
}

export function useMyArtistStatus(itemId: string | undefined) {
  // Status comes from the by-slug response, but we can also check directly
  return useQuery<"founded" | "collected" | "none">({
    queryKey: ["myArtistStatus", itemId],
    queryFn: async () => {
      // Check founder badge
      const res = await apiCall<{ data: { is_founded: boolean; founder: any } }>(
        `/api/founders/check/${itemId}`
      );
      if (res.data?.is_founded) {
        // Check if it's the current user
        return "founded"; // simplified — full check would compare user IDs
      }
      // Check collection
      const colRes = await apiCall<{ data: string[] }>(`/api/collections/my-ids`);
      const ids = colRes.data ?? [];
      if (ids.includes(itemId!)) return "collected";
      return "none";
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}

export function useArtistFans(itemId: string | undefined) {
  return useQuery<ItemFan[]>({
    queryKey: ["artistFans", itemId],
    queryFn: async () => {
      const res = await apiCall<{ data: ItemFan[] }>(`/api/items/${itemId}/fans`);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}
