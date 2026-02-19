import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { AppColors } from "@/constants/theme";

interface CoinIconProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function CoinIcon({ size = 23, color = AppColors.coinYellow, style }: CoinIconProps) {
  const fontSize = Math.max(10, Math.floor(size * 0.55));
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}>
      <Text style={[styles.c, { fontSize }]}>C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  c: {
    color: AppColors.background,
    fontWeight: "800",
  },
});
