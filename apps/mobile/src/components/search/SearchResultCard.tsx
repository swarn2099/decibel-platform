import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import type { DecibelSearchResult } from "@/types";

export function SearchResultCard({ item }: { item: DecibelSearchResult }) {
  const colors = useThemeColors();
  const router = useRouter();
  const initials = item.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Pressable
      onPress={() => router.push(`/artist/${item.slug}` as any)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 20 }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={{ width: 48, height: 48 }} contentFit="cover" />
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>{initials}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.text }} numberOfLines={1}>{item.name}</Text>
        {item.genres && item.genres.length > 0 && (
          <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }} numberOfLines={1}>
            {item.genres.slice(0, 3).join(" · ")}
          </Text>
        )}
      </View>
      <Text style={{ fontSize: 12, fontFamily: "Poppins_500Medium", color: colors.textTertiary }}>
        {item.fan_count} {item.fan_count === 1 ? "fan" : "fans"}
      </Text>
    </Pressable>
  );
}
