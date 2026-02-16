import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { AppColors } from "@/constants/theme";

interface ToggleProps {
  value: boolean;
  onPress: () => void;
  activeColor?: string;
}

export function Toggle({ value, onPress, activeColor }: ToggleProps) {
  const thumbPosition = useSharedValue(value ? 1 : 0);
  const color = activeColor ?? AppColors.primary;

  React.useEffect(() => {
    thumbPosition.value = withTiming(value ? 1 : 0, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbPosition.value * 22 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.track, value && { backgroundColor: color }]}
    >
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.toggleTrack,
    padding: 3,
    justifyContent: "center",
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppColors.toggleThumb,
  },
});
