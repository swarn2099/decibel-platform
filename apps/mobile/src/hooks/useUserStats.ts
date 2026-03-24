import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type StatsResponse = {
  data: {
    finds: number;
    founders: number;
    influence: number;
  };
};

export function useUserStats() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      const res = await apiCall<StatsResponse>(`/api/users/${user!.id}/stats`);
      return res.data;
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
