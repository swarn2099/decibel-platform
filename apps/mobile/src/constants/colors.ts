import { useColorScheme } from "react-native";

const accents = {
  pink: "#FF4D6A",
  purple: "#9B6DFF",
  blue: "#4D9AFF",
  teal: "#00D4AA",
  yellow: "#FFD700",
} as const;

type ThemeColorSet = {
  pink: string;
  purple: string;
  blue: string;
  teal: string;
  yellow: string;
  gold: string;
  bg: string;
  card: string;
  cardHover: string;
  cardBorder: string;
  cardElevated: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDim: string;
  border: string;
  divider: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  gray: string;
  lightGray: string;
  isDark: boolean;
};

const DarkColors: ThemeColorSet = {
  ...accents,
  gold: "#FFD700",
  bg: "#0B0B0F",
  card: "#15151C",
  cardHover: "#1C1C28",
  cardBorder: "rgba(255,255,255,0.06)",
  cardElevated: "#1C1C26",
  text: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.6)",
  textTertiary: "rgba(255,255,255,0.35)",
  textDim: "#55556A",
  border: "rgba(255,255,255,0.06)",
  divider: "rgba(255,255,255,0.06)",
  tabBarBg: "#0B0B0F",
  tabBarBorder: "rgba(255,255,255,0.06)",
  inputBg: "#1C1C26",
  inputBorder: "rgba(255,255,255,0.1)",
  gray: "#8E8E9A",
  lightGray: "#55556A",
  isDark: true,
};

const LightColors: ThemeColorSet = {
  ...accents,
  gold: "#DAA520",
  bg: "#F5F5F7",
  card: "#FFFFFF",
  cardHover: "#F0F0F2",
  cardBorder: "rgba(0,0,0,0.06)",
  cardElevated: "#FFFFFF",
  text: "#0B0B0F",
  textPrimary: "#0B0B0F",
  textSecondary: "rgba(0,0,0,0.5)",
  textTertiary: "rgba(0,0,0,0.3)",
  textDim: "#A0A0B0",
  border: "rgba(0,0,0,0.06)",
  divider: "rgba(0,0,0,0.06)",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "rgba(0,0,0,0.08)",
  inputBg: "#EDEDF0",
  inputBorder: "rgba(0,0,0,0.08)",
  gray: "#6E6E7A",
  lightGray: "#A0A0B0",
  isDark: false,
};

export type ThemeColors = ThemeColorSet;

export const Colors = DarkColors;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "light" ? LightColors : DarkColors;
}
