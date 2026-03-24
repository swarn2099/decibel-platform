import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Star, UserPlus, TrendingUp, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { useNotifications, useMarkRead, type Notification } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/formatDate";
import { useEffect } from "react";

const ICON_MAP: Record<string, { Icon: typeof Star; color: string }> = {
  collection: { Icon: CheckCircle, color: "#FF4D6A" },
  follow: { Icon: UserPlus, color: "#4D9AFF" },
  portfolio_update: { Icon: TrendingUp, color: "#00D4AA" },
};

function NotificationRow({ item, onPress }: { item: Notification; onPress: () => void }) {
  const colors = useThemeColors();
  const config = ICON_MAP[item.type] ?? { Icon: Star, color: colors.purple };
  const isUnread = !item.read_at;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: isUnread ? `${colors.pink}08` : "transparent",
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${config.color}20`, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <config.Icon size={18} color={config.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: isUnread ? "Poppins_600SemiBold" : "Poppins_400Regular", color: colors.text }}>
          {item.title}
        </Text>
        {item.body && (
          <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 2 }}>
            {item.body}
          </Text>
        )}
        <Text style={{ fontSize: 11, fontFamily: "Poppins_400Regular", color: colors.textTertiary, marginTop: 4 }}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
      {isUnread && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink, marginTop: 6 }} />
      )}
    </Pressable>
  );
}

export default function ActivityScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkRead();

  // Mark all as read when screen opens
  useEffect(() => {
    const unreadIds = (notifications ?? []).filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNotificationPress(item: Notification) {
    if (item.type === "collection" && item.data?.item_slug) {
      router.push(`/artist/${item.data.item_slug}` as any);
    } else if (item.type === "follow" && item.data?.follower_id) {
      router.push(`/profile/${item.data.follower_id}` as any);
    } else if (item.type === "portfolio_update" && item.data?.item_slug) {
      router.push(`/artist/${item.data.item_slug}` as any);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Poppins_600SemiBold", color: colors.text }}>Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => handleNotificationPress(item)} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: 20 }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>No activity yet</Text>
              <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary, textAlign: "center" }}>
                You'll see notifications here when people collect your finds or follow you.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
