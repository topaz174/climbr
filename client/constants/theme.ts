import { Platform } from "react-native";

export const AppColors = {
  // Base
  background: "#1A1A1B",
  surface: "#0A0A0A",
  surfaceOpacity: "rgba(10, 10, 10, 0.8)",
  
  // Primary
  primary: "#FF6B35",
  primaryLight: "rgba(255, 107, 53, 0.2)",
  
  // Text
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.4)",
  textMuted: "rgba(255, 255, 255, 0.3)",
  textGray: "#E6E6E6",
  textDarkGray: "#4D4D4D",
  textLight: "#F3F3F3",
  
  // Borders
  border: "rgba(255, 255, 255, 0.05)",
  borderDark: "rgba(0, 0, 0, 0.4)",
  borderMedium: "rgba(42, 42, 42, 0.5)",
  borderLight: "rgba(40, 40, 40, 0.3)",
  borderSubtle: "rgba(58, 58, 58, 0.5)",
  divider: "rgba(33, 33, 33, 0.6)",
  
  // Basic
  white: "#FFFFFF",
  black: "#000000",
  
  // Cards & Surfaces
  cardBackground: "#2A2A2B",
  cardBackgroundLight: "#3A3A3B",
  cardBackgroundDark: "#2C2C2C",
  
  // Special
  hillColor: "#1E3A5F",
  hardcoreRed: "#B22222",
  
  // Status
  success: "#4CAF50",
  successLight: "rgba(76, 175, 80, 0.2)",
  warning: "#FFC107",
  live: "#FF4444",
  
  // Overlays & Shadows
  overlay: "rgba(0, 0, 0, 0.4)",
  shadowDark: "#000",
  
  // Icons & Controls
  iconGray: "rgba(180, 180, 180, 0.8)",
  iconLight: "rgba(255, 255, 255, 0.6)",
  iconSubtle: "rgba(255, 255, 255, 0.5)",
  controlGray: "rgba(120, 120, 120, 0.7)",
  
  // Progress Ring
  progressRingBackground: "rgba(42, 42, 42, 0.8)",
  
  // Toggle
  toggleTrack: "#3e3e3e",
  toggleThumb: "#f4f3f4",
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
  bodySmall: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  tiny: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600" as const,
    letterSpacing: 1,
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
  timerLarge: {
    fontSize: 72,
    lineHeight: 80,
    fontWeight: "300" as const,
  },
  timerLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
    letterSpacing: 2,
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  modalTitleSmall: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700" as const,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  buttonSmall: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
};

export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 30,
  xl: 48,
  "2xl": 56,
  "3xl": 64,
  "4xl": 72,
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
