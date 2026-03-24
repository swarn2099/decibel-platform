import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const res = await apiCall<{ data: Notification[] }>("/api/notifications?limit=50");
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
    enabled: !!user?.id,
  });
}

export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["unreadCount", user?.id],
    queryFn: async () => {
      const res = await apiCall<{ data: { count: number } }>("/api/notifications/unread-count");
      return res.data?.count ?? 0;
    },
    staleTime: 60 * 1000,
    enabled: !!user?.id,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      return apiCall("/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}
