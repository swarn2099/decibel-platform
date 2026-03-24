import { View, Text } from "react-native";
import { useThemeColors } from "@/constants/colors";

type StatsBarProps = {
  artists: number;
  founders: number;
  influence: number;
  isLoading: boolean;
};

function StatItem({ value, label, accentColor, isLoading }: { value: number; label: string; accentColor: string; isLoading: boolean }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: "Poppins_700Bold", lineHeight: 24 }}>
        {isLoading ? "---" : value.toLocaleString()}
      </Text>
      <Text style={{ color: accentColor, fontSize: 11, fontFamily: "Poppins_500Medium", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

export function StatsBar({ artists, founders, influence, isLoading }: StatsBarProps) {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: "row", marginHorizontal: 20, marginBottom: 16 }}>
      <StatItem value={artists} label="Artists" accentColor={colors.pink} isLoading={isLoading} />
      <View style={{ width: 1, backgroundColor: colors.cardBorder, marginVertical: 10 }} />
      <StatItem value={founders} label="Founders" accentColor={colors.gold} isLoading={isLoading} />
      <View style={{ width: 1, backgroundColor: colors.cardBorder, marginVertical: 10 }} />
      <StatItem value={influence} label="Influence" accentColor={colors.purple} isLoading={isLoading} />
    </View>
  );
}
