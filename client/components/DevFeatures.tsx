/**
 * DEV FEATURES ONLY
 * This file contains development-only debugging features.
 * DELETE THIS FILE AND ITS IMPORT BEFORE PRODUCTION RELEASE.
 */

import React, { useRef } from "react";
import { Pressable, StyleSheet, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useTimerStore } from "@/stores/timerStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function DevFeatures() {
  const phase = useTimerStore((s) => s.phase);
  const subtractTime = useTimerStore((s) => s.subtractTime);
  const rapidIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePress = () => {
    if (phase === "climbing" || phase === "plateau") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      subtractTime(60);
    }
  };

  const handleLongPress = () => {
    if (phase !== "climbing" && phase !== "plateau") return;
    if (rapidIntervalRef.current) return;
    rapidIntervalRef.current = setInterval(() => {
      subtractTime(60);
    }, 80);
  };

  const handlePressOut = () => {
    if (rapidIntervalRef.current) {
      clearInterval(rapidIntervalRef.current);
      rapidIntervalRef.current = null;
    }
  };

  if (phase !== "climbing" && phase !== "plateau") {
    return null;
  }

  return (
    <Pressable
      style={styles.timerOverlay}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      delayLongPress={400}
    />
  );
}

const styles = StyleSheet.create({
  timerOverlay: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.64,
    left: SCREEN_WIDTH * 0.1,
    right: SCREEN_WIDTH * 0.1,
    height: 100,
    zIndex: 9999,
  },
});
