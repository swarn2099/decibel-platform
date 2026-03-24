import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { House, Plus, Ticket } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_CONFIG: { name: string; title: string; Icon: LucideIcon; isCenter?: boolean }[] = [
  { name: "index", title: "Home", Icon: House },
  { name: "add", title: "Add", Icon: Plus, isCenter: true },
  { name: "passport", title: "Profile", Icon: Ticket },
];

export const TAB_BAR_HEIGHT = 60;

function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const activeColor = colors.pink;
  const inactiveColor = colors.isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.isDark ? "#0B0B0F" : "#FFFFFF", borderTopColor: colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
      {state.routes.map((route, index) => {
        const config = TAB_CONFIG.find((t) => t.name === route.name);
        if (!config) return null;

        const isFocused = state.index === index;
        const isCenter = config.isCenter;
        const color = isFocused ? activeColor : inactiveColor;
        const iconSize = isCenter ? 28 : 26;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity key={route.key} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} onPress={onPress} activeOpacity={0.7} style={styles.tab}>
            <config.Icon size={iconSize} color={color} strokeWidth={isFocused ? 2.5 : 2} />
            <Text style={[styles.label, { color }]}>{config.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="passport" options={{ title: "Passport" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderTopWidth: 0.5 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minWidth: 64, gap: 3, paddingTop: 8, paddingBottom: 4 },
  label: { fontSize: 11, fontFamily: "Poppins_500Medium" },
});
