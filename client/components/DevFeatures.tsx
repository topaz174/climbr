/**
 * DEV FEATURES ONLY
 * This file contains development-only debugging features.
 * DELETE THIS FILE AND ITS IMPORT BEFORE PRODUCTION RELEASE.
 */

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useTimerStore } from "@/stores/timerStore";

export function DevFeatures() {
  const phase = useTimerStore((s) => s.phase);
  const timeRemaining = useTimerStore((s) => s.timeRemaining);

  const handlePress = () => {
    if (phase === "climbing" || phase === "plateau") {
      const newTime = Math.max(0, timeRemaining - 10);
      const endTimestamp = Date.now() + newTime * 1000;
      useTimerStore.setState({
        timeRemaining: newTime,
        endTimestamp,
      });
      console.log("[DEV] Subtracted 10 seconds from timer");
    }
  };

  return (
    <Pressable
      style={styles.devButton}
      onPress={handlePress}
      hitSlop={{ top: 30, right: 30, bottom: 30, left: 30 }}
    />
  );
}

const styles = StyleSheet.create({
  devButton: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 60,
    height: 60,
    zIndex: 9999,
  },
});
