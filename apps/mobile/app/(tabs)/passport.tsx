import { View, Text, FlatList, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePassport, type PassportItem } from "@/hooks/usePassport";
import { useSocialCounts } from "@/hooks/useFollow";
import { PassportHeader } from "@/components/passport/PassportHeader";
import { useThemeColors } from "@/constants/colors";
import { apiCall } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type UserProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
};

function useUserProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      try {
        const res = await apiCall<{ data: UserProfile }>(`/api/users/me`);
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });
}

function CollectionGridCell({ item, cellSize }: { item: PassportItem; cellSize: number }) {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => { if (item.item?.slug) router.push(`/artist/${item.item.slug}` as any); }}
      style={{ width: cellSize, height: cellSize, borderRadius: 6, overflow: "hidden", backgroundColor: colors.card }}
    >
      {item.item?.photo_url ? (
        <Image source={{ uri: item.item.photo_url }} style={{ width: cellSize, height: cellSize }} contentFit="cover" />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 24, color: colors.textSecondary }}>{(item.item?.name ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingHorizontal: 6, paddingBottom: 4 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins_600SemiBold" }} numberOfLines={1}>{item.item?.name ?? "Unknown"}</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, fontFamily: "Poppins_400Regular" }} numberOfLines={1}>
          {item.is_founder ? "★ Founded" : "Collected"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function PassportScreen() {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"finds" | "collections">("finds");

  const { data: profile } = useUserProfile();
  const { data: passportItems, isLoading } = usePassport();
  const { data: socialCounts } = useSocialCounts();
  const user = useAuthStore((s) => s.user);

  const finds = (passportItems ?? []).filter((p) => p.is_founder);
  const collections = (passportItems ?? []).filter((p) => !p.is_founder);
  const activeItems = activeTab === "finds" ? finds : collections;

  const CELL_GAP = 3;
  const COLUMNS = 3;
  const cellSize = (screenWidth - CELL_GAP * (COLUMNS + 1)) / COLUMNS;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        data={activeItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: CELL_GAP, paddingHorizontal: CELL_GAP }}
        contentContainerStyle={{ gap: CELL_GAP, paddingTop: CELL_GAP, paddingBottom: 120 }}
        renderItem={({ item }) => <CollectionGridCell item={item} cellSize={cellSize} />}
        ListHeaderComponent={
          <>
            <PassportHeader
              displayName={profile?.name ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              memberSince={profile?.created_at ?? new Date().toISOString()}
              followersCount={socialCounts?.followers_count ?? 0}
              followingCount={socialCounts?.following_count ?? 0}
              findsCount={finds.length}
              collectionsCount={collections.length}
              fanId={profile?.id ?? ""}
            />
            {/* Tab pills */}
            <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 }}>
              <Pressable onPress={() => setActiveTab("finds")} style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: "center", backgroundColor: activeTab === "finds" ? colors.pink : colors.card }}>
                <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: activeTab === "finds" ? "#FFFFFF" : colors.textSecondary }}>
                  Finds ({finds.length})
                </Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab("collections")} style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: "center", backgroundColor: activeTab === "collections" ? colors.pink : colors.card }}>
                <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: activeTab === "collections" ? "#FFFFFF" : colors.textSecondary }}>
                  Collections ({collections.length})
                </Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>
              {activeTab === "finds" ? "No finds yet" : "No collections yet"}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary, textAlign: "center" }}>
              {activeTab === "finds" ? "Add an artist to start your collection!" : "Collect artists from the feed!"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
