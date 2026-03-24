import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ChevronLeft } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useThemeColors } from "@/constants/colors";

export default function FollowingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { fanId } = useLocalSearchParams<{ fanId: string }>();

  const { data: following, isLoading } = useQuery({
    queryKey: ["following", fanId],
    queryFn: async () => {
      const res = await apiCall<{ data: { id: string; name: string; avatar_url: string | null }[] }>(
        `/api/users/${fanId}/following`
      );
      return res.data ?? [];
    },
    enabled: !!fanId,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }}>Following</Text>
        <View style={{ width: 40 }} />
      </View>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={colors.pink} /></View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/profile/${item.id}` as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={{ width: 40, height: 40 }} contentFit="cover" /> : <Text style={{ fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.textSecondary }}>{(item.name ?? "?").charAt(0).toUpperCase()}</Text>}
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.text }}>{item.name ?? "User"}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<View style={{ alignItems: "center", paddingVertical: 40 }}><Text style={{ color: colors.textSecondary, fontFamily: "Poppins_400Regular" }}>Not following anyone yet</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}
