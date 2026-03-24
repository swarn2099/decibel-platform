import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/constants/colors";

export default function LoginScreen() {
  const colors = useThemeColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: "decibel://auth/callback" },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <Svg height={48} width={240}>
            <Defs>
              <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.pink} />
                <Stop offset="0.5" stopColor={colors.purple} />
                <Stop offset="1" stopColor={colors.blue} />
              </SvgLinearGradient>
            </Defs>
            <SvgText fill="url(#grad)" fontSize="36" fontWeight="bold" fontFamily="Poppins_700Bold" x="120" y="38" textAnchor="middle">
              DECIBEL
            </SvgText>
          </Svg>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: "Poppins_400Regular", marginTop: 8 }}>
            Discover what's next
          </Text>
        </View>

        {sent ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontFamily: "Poppins_600SemiBold", textAlign: "center" }}>Check your email</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: "Poppins_400Regular", textAlign: "center" }}>
              We sent a magic link to {email}
            </Text>
            <Pressable onPress={() => setSent(false)} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.pink, fontSize: 14, fontFamily: "Poppins_500Medium" }}>Use a different email</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              style={{
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                fontFamily: "Poppins_400Regular",
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <Pressable
              onPress={handleLogin}
              disabled={loading || !email.trim()}
              style={{
                backgroundColor: colors.pink,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                opacity: loading || !email.trim() ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>Send Magic Link</Text>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
