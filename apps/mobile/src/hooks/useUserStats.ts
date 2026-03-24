import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useUserStats() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      const userId = user?.id;
      if (!userId) return { finds: 0, founders: 0, influence: 0 };

      // Count collections (finds)
      const { count: findsCount } = await supabase
        .from("collections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count founder badges
      const { count: foundersCount } = await supabase
        .from("founder_badges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      // Influence: count collections on items I founded
      const { data: myFoundedItems } = await supabase
        .from("founder_badges")
        .select("item_id")
        .eq("user_id", userId);

      let influence = 0;
      if (myFoundedItems?.length) {
        const itemIds = myFoundedItems.map((f) => f.item_id);
        const { count } = await supabase
          .from("collections")
          .select("id", { count: "exact", head: true })
          .in("item_id", itemIds);
        influence = count ?? 0;
      }

      return {
        finds: findsCount ?? 0,
        founders: foundersCount ?? 0,
        influence,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id,
  });

  return {
    finds: data?.finds ?? 0,
    founders: data?.founders ?? 0,
    influence: data?.influence ?? 0,
    isLoading,
  };
}
