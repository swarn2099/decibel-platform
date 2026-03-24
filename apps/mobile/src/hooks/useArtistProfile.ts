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
        const res = await apiCall<{ data: ItemDetailResponse }>(`/api/items/by-slug/${slug}`);
        return res.data ?? null;
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
  return useQuery<"founded" | "collected" | "none">({
    queryKey: ["myArtistStatus", itemId],
    queryFn: async () => {
      // Check if current user founded this item
      const res = await apiCall<{ data: { is_founder: boolean; is_collected: boolean } }>(
        `/api/items/${itemId}/my-status`
      );
      if (res.data?.is_founder) return "founded";
      if (res.data?.is_collected) return "collected";
      return "none";
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!itemId,
  });
}

export type MetricsPoint = { date: string; listeners: number };

export function useArtistMetricsHistory(itemId: string | undefined) {
  return useQuery<MetricsPoint[]>({
    queryKey: ["artistMetrics", itemId],
    queryFn: async () => {
      const res = await apiCall<{ data: MetricsPoint[] }>(`/api/items/${itemId}/metrics-history`);
      return res.data ?? [];
    },
    staleTime: 30 * 60 * 1000,
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
