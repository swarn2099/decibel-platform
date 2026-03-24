import { useEffect } from "react";
import { Stack, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const segments = useSegments();

  if (isLoading) return null;

  const inAuthGroup = segments[0] === "(auth)";

  if (!session && !inAuthGroup) {
    return <Redirect href={"/(auth)/login" as any} />;
  }
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="artist/[slug]" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="leaderboard" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="search" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="profile/[id]" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="followers" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="following" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}
