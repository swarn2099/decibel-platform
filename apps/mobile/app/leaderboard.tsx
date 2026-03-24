import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useThemeColors } from "@/constants/colors";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardView, LeaderboardEntry, TimePeriod } from "@/types";

const VIEWS: { value: LeaderboardView; label: string }[] = [
  { value: "founders", label: "Most Founders" },
  { value: "influence", label: "Highest Influence" },
  { value: "trending", label: "Trending" },
];

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "allTime", label: "All Time" },
  { value: "monthly", label: "This Month" },
  { value: "weekly", label: "This Week" },
];

const GOLD = "#FFD700";
const SILVER = "#C0C0C0";
const BRONZE = "#CD7F32";

function PodiumAvatar({ entry, size, accentColor, onPress }: { entry: LeaderboardEntry; size: number; accentColor: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: accentColor, overflow: "hidden", backgroundColor: colors.card }}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={{ width: size, height: size }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: size * 0.38, fontFamily: "Poppins_700Bold", color: accentColor }}>{(entry.name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={{ marginTop: 6, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: accentColor, textAlign: "center", maxWidth: size + 16 }} numberOfLines={1}>{entry.name}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Poppins_500Medium", color: accentColor, opacity: 0.85 }}>{entry.metric}</Text>
    </Pressable>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [view, setView] = useState<LeaderboardView>("founders");
  const [period, setPeriod] = useState<TimePeriod>("allTime");
  const { entries, userPosition, isLoading, isError, refetch, currentFanId } = useLeaderboard({ view, period });

  const metricLabel = view === "founders" ? "founders" : view === "influence" ? "influence" : "this week";
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const renderRow = ({ item }: { item: LeaderboardEntry }) => {
    const isMe = item.fanId === currentFanId;
    return (
      <Pressable
        style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 14 }, isMe && { borderLeftWidth: 3, borderLeftColor: colors.pink, backgroundColor: `${colors.pink}18` }]}
        onPress={() => router.push(`/profile/${item.fanId}` as any)}
      >
        <Text style={{ width: 32, fontSize: 18, fontFamily: "Poppins_700Bold", color: colors.textSecondary, textAlign: "center", marginRight: 12 }}>{item.rank}</Text>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} contentFit="cover" />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Poppins_700Bold", color: colors.textSecondary }}>{(item.name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.text }} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={{ fontSize: 15, fontFamily: "Poppins_600SemiBold", color: colors.pink }}>{item.metric} {metricLabel}</Text>
      </Pressable>
    );
  };

  const PodiumSection = top3.length > 0 ? (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 }}>
      {top3[1] ? <View><PodiumAvatar entry={top3[1]} size={52} accentColor={SILVER} onPress={() => router.push(`/profile/${top3[1].fanId}` as any)} /></View> : <View style={{ width: 52 }} />}
      {top3[0] ? <View style={{ marginBottom: 8 }}><PodiumAvatar entry={top3[0]} size={64} accentColor={GOLD} onPress={() => router.push(`/profile/${top3[0].fanId}` as any)} /></View> : null}
      {top3[2] ? <View><PodiumAvatar entry={top3[2]} size={52} accentColor={BRONZE} onPress={() => router.push(`/profile/${top3[2].fanId}` as any)} /></View> : <View style={{ width: 52 }} />}
    </View>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Poppins_600SemiBold", color: colors.text }}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        {VIEWS.map((v) => (
          <Pressable key={v.value} style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: "center", backgroundColor: view === v.value ? colors.pink : colors.card }} onPress={() => setView(v.value)}>
            <Text style={{ fontSize: 11, fontFamily: "Poppins_600SemiBold", color: view === v.value ? "#FFFFFF" : colors.textSecondary }}>{v.label}</Text>
          </Pressable>
        ))}
      </View>

      {view !== "trending" && (
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 12 }}>
          {PERIODS.map(({ value, label }) => (
            <Pressable key={value} style={{ flex: 1, paddingVertical: 5, borderRadius: 16, alignItems: "center", backgroundColor: period === value ? colors.pink : colors.card }} onPress={() => setPeriod(value)}>
              <Text style={{ fontSize: 12, fontFamily: "Poppins_500Medium", color: period === value ? "#FFFFFF" : colors.textSecondary }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary, marginBottom: 12 }}>Failed to load</Text>
          <Pressable style={{ backgroundColor: colors.pink, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }} onPress={() => refetch()}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.fanId}
          renderItem={renderRow}
          ListHeaderComponent={PodiumSection}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
        />
      )}

      {userPosition && (
        <View style={{ position: "absolute", bottom: 100, left: 16, right: 16, backgroundColor: colors.card, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: colors.pink, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}>
          <Text style={{ width: 32, fontSize: 18, fontFamily: "Poppins_700Bold", color: colors.pink, textAlign: "center", marginRight: 12 }}>{userPosition.rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.text }} numberOfLines={1}>{userPosition.name}</Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Poppins_600SemiBold", color: colors.pink }}>{userPosition.metric} {metricLabel}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
