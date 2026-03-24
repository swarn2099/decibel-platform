import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";

export default function NotFoundScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>Page not found</Text>
      <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.pink, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" }}>Go back</Text>
      </Pressable>
    </View>
  );
}
