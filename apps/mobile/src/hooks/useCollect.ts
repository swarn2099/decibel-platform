import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useCollectItem() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Check if already collected
      const { data: existing } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyDone: true };
      }

      const { error } = await supabase.from("collections").insert({
        user_id: userId,
        item_id: itemId,
        capture_method: "online",
        verified: true,
        collection_type: "stamp",
      });

      if (error) throw error;
      return { success: true, alreadyDone: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["myCollectedIds"] });
      queryClient.invalidateQueries({ queryKey: ["passport"] });
    },
  });
}

export function useMyCollectedIds() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["myCollectedIds", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("item_id")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []).map((row: { item_id: string }) => row.item_id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    collectedIds: new Set<string>(data ?? []),
    isLoading,
  };
}
