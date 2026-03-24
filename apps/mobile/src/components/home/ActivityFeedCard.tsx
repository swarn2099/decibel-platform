import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Star, CheckCircle, Compass } from "lucide-react-native";
import { useThemeColors } from "@/constants/colors";
import { formatRelativeTime } from "@/lib/formatDate";
import type { ActivityFeedItem, ActivityFeedAction } from "@/types";

const ACTION_CONFIG: Record<ActivityFeedAction, { verbPast: string; colorKey: "gold" | "pink" | "purple"; Icon: typeof Star }> = {
  founded: { verbPast: "founded", colorKey: "gold", Icon: Star },
  collected: { verbPast: "collected", colorKey: "pink", Icon: CheckCircle },
  discovered: { verbPast: "discovered", colorKey: "purple", Icon: Compass },
};

function AvatarCircle({ uri, name, size, borderColor }: { uri: string | null; name: string; size: number; borderColor?: string }) {
  const colors = useThemeColors();
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card, borderWidth: borderColor ? 2 : 0, borderColor: borderColor || "transparent", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: size * 0.35, fontFamily: "Poppins_600SemiBold" }}>{initials}</Text>
      )}
    </View>
  );
}

type ActivityFeedCardProps = {
  item: ActivityFeedItem;
  onCollect?: (itemId: string) => void;
  isCollected?: boolean;
};

export function ActivityFeedCard({ item, onCollect, isCollected = false }: ActivityFeedCardProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const config = ACTION_CONFIG[item.action];
  const actionColor = colors[config.colorKey];

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable onPress={() => router.push(`/profile/${item.fan_id}` as any)}>
        <AvatarCircle uri={item.fan_avatar} name={item.fan_name} size={32} />
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: "Poppins_400Regular" }} numberOfLines={2}>
          <Text style={{ fontFamily: "Poppins_600SemiBold" }} onPress={() => router.push(`/profile/${item.fan_id}` as any)}>
            {item.fan_name}
          </Text>
          {" "}
          <Text style={{ color: actionColor, fontFamily: "Poppins_600SemiBold" }}>{config.verbPast}</Text>
          {" "}
          <Text style={{ fontFamily: "Poppins_600SemiBold" }}>{item.performer_name}</Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: "Poppins_400Regular" }}>
            {formatRelativeTime(item.timestamp)}
          </Text>
          {item.performer_genres?.slice(0, 2).map((genre) => (
            <View key={genre} style={{ backgroundColor: colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10, color: colors.isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)", fontFamily: "Poppins_400Regular" }}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <Pressable onPress={() => router.push(`/artist/${item.performer_slug}` as any)}>
          <AvatarCircle uri={item.performer_image} name={item.performer_name} size={40} borderColor={actionColor} />
        </Pressable>
        {onCollect && (
          isCollected ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <CheckCircle size={12} color={colors.teal} />
              <Text style={{ color: colors.teal, fontSize: 11, fontFamily: "Poppins_500Medium" }}>Collected</Text>
            </View>
          ) : (
            <Pressable onPress={() => onCollect(item.performer_id)} style={{ backgroundColor: colors.pink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins_600SemiBold" }}>Collect</Text>
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

export function ActivityFeedEmpty() {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: "center", gap: 8 }}>
      <Compass size={32} color={colors.purple} />
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>No discoveries yet</Text>
      <Text style={{ color: colors.textSecondary, textAlign: "center", fontSize: 12, fontFamily: "Poppins_400Regular" }}>
        Be the first to find someone new! Head to Search to discover artists.
      </Text>
    </View>
  );
}
