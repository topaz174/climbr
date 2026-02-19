import React, { ReactNode, useState } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, Text } from "react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/contexts/ThemeContext";
import { AppColors, BorderRadius, Spacing, Typography } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "coin" | "success";

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  onPress,
  children,
  variant = "primary",
  style,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const { accentColor } = useTheme();
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    if (variant === "primary") return accentColor;
    if (variant === "danger") return AppColors.hardcoreRed;
    if (variant === "coin") return AppColors.coinYellow;
    if (variant === "success") return AppColors.success;
    return AppColors.cardBackgroundLight;
  };

  const getTextColor = () => {
    if (variant === "primary" || variant === "danger" || variant === "success") return AppColors.text;
    if (variant === "coin") return AppColors.background;
    return AppColors.text;
  };

  const getBorderStyle = () => {
    if (variant === "secondary") {
      return {
        borderWidth: 1,
        borderColor: AppColors.border,
      };
    }
    return {};
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        getBorderStyle(),
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: getTextColor(),
            fontWeight: variant === "primary" || variant === "danger" || variant === "coin" || variant === "success" ? "700" : "600",
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  fullWidth: {
    flex: 1,
  },
  buttonText: {
    ...Typography.button,
  },
});
