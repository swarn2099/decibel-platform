import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";

const GRADIENT_PAIRS: [string, string][] = [
  ["#FF4D6A", "#9B6DFF"],
  ["#9B6DFF", "#4D9AFF"],
  ["#4D9AFF", "#00D4AA"],
  ["#00D4AA", "#FF4D6A"],
  ["#FFD700", "#FF4D6A"],
  ["#9B6DFF", "#00D4AA"],
];

function getGradientForName(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length];
}

function StatCell({ value, label, onPress, colors }: { value: string; label: string; onPress?: () => void; colors: ReturnType<typeof useThemeColors> }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper {...(onPress ? { onPress, hitSlop: 8 } : {})} style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: colors.text, lineHeight: 26 }}>{value}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 1 }}>{label}</Text>
    </Wrapper>
  );
}

type Props = {
  displayName: string | null;
  avatarUrl: string | null;
  memberSince: string;
  followersCount: number;
  followingCount: number;
  findsCount: number;
  collectionsCount: number;
  fanId: string;
};

export function PassportHeader({ displayName, avatarUrl, memberSince, followersCount, followingCount, findsCount, collectionsCount, fanId }: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const name = displayName || "Fan";
  const initial = name.charAt(0).toUpperCase();
  const gradientColors = getGradientForName(name);

  const memberDate = new Date(memberSince);
  const memberLabel = memberDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80 }} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 80, height: 80, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 32, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.8)" }}>{initial}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-around" }}>
          <StatCell value={String(followersCount)} label="Followers" colors={colors} onPress={() => router.push({ pathname: "/followers" as any, params: { fanId } })} />
          <StatCell value={String(followingCount)} label="Following" colors={colors} onPress={() => router.push({ pathname: "/following" as any, params: { fanId } })} />
          <StatCell value={String(findsCount)} label="Finds" colors={colors} />
          <StatCell value={String(collectionsCount)} label="Collections" colors={colors} />
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 2 }}>
          Member since {memberLabel}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 12 }}>
        <Pressable onPress={() => router.push("/settings" as any)} style={{ flex: 1 }}>
          <View style={{ height: 34, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.text }}>Edit Profile</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
