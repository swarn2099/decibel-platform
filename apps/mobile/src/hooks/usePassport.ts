import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
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
      const res = await apiCall<{ data: PassportItem[] }>(
        `/api/users/me/passport`
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });
}
