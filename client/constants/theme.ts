import { Platform } from "react-native";

export const AppColors = {
  background: "#1A1A1B",
  surface: "#0A0A0A",
  surfaceOpacity: "rgba(10, 10, 10, 0.8)",
  primary: "#FF6B35",
  primaryLight: "rgba(255, 107, 53, 0.2)",
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.4)",
  textMuted: "rgba(255, 255, 255, 0.3)",
  border: "rgba(255, 255, 255, 0.05)",
  white: "#FFFFFF",
  black: "#000000",
  cardBackground: "#2A2A2B",
  cardBackgroundLight: "#3A3A3B",
  hillColor: "#1E3A5F",
  success: "#4CAF50",
  warning: "#FFC107",
  live: "#FF4444",
};

const tintColorLight = "#007AFF";
const tintColorDark = "#0A84FF";

export const Colors = {
  light: {
    text: "#FFFFFF",
    buttonText: "#000000",
    tabIconDefault: "rgba(255, 255, 255, 0.3)",
    tabIconSelected: "#FFFFFF",
    link: AppColors.primary,
    backgroundRoot: AppColors.background,
    backgroundDefault: AppColors.cardBackground,
    backgroundSecondary: AppColors.cardBackgroundLight,
    backgroundTertiary: "#4A4A4B",
  },
  dark: {
    text: "#FFFFFF",
    buttonText: "#000000",
    tabIconDefault: "rgba(255, 255, 255, 0.3)",
    tabIconSelected: "#FFFFFF",
    link: AppColors.primary,
    backgroundRoot: AppColors.background,
    backgroundDefault: AppColors.cardBackground,
    backgroundSecondary: AppColors.cardBackgroundLight,
    backgroundTertiary: "#4A4A4B",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  tabBarHeight: 96,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  timer: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "300" as const,
  },
  timerLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
    letterSpacing: 2,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
