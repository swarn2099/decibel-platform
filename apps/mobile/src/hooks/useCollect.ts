import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function useCollectItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      return apiCall<{ data: { success: boolean; already_collected: boolean } }>("/api/collections", {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["myCollectedIds"] });
      queryClient.invalidateQueries({ queryKey: ["passport"] });
    },
  });
}

export function useUncollectItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      return apiCall("/api/collections/by-item/" + itemId, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      queryClient.invalidateQueries({ queryKey: ["myCollectedIds"] });
      queryClient.invalidateQueries({ queryKey: ["passport"] });
      queryClient.invalidateQueries({ queryKey: ["myArtistStatus"] });
    },
  });
}

export function useMyCollectedIds() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["myCollectedIds", user?.id],
    queryFn: async () => {
      const res = await apiCall<{ data: string[] }>("/api/collections/my-ids");
      return res.data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    collectedIds: new Set<string>(data ?? []),
    isLoading,
  };
}
