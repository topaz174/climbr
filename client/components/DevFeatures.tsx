/**
 * DEV FEATURES ONLY
 * This file contains development-only debugging features.
 * DELETE THIS FILE AND ITS IMPORT BEFORE PRODUCTION RELEASE.
 */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTimerStore } from "@/stores/timerStore";

export function DevFeatures() {
  const phase = useTimerStore((s) => s.phase);
  const timeRemaining = useTimerStore((s) => s.timeRemaining);

  const handleAddTime = () => {
    if (phase === "climbing" || phase === "plateau") {
      const newTime = timeRemaining + 30;
      const endTimestamp = Date.now() + newTime * 1000;
      useTimerStore.setState({
        timeRemaining: newTime,
        endTimestamp,
      });
      console.log("[DEV] Added 30 seconds to timer");
    }
  };

  return (
    <Pressable
      style={styles.devButton}
      onPress={handleAddTime}
      hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
    >
      <Text style={styles.devButtonText}>+30s</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  devButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(255, 0, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 255, 0.5)",
    zIndex: 9999,
  },
  devButtonText: {
    color: "#FF00FF",
    fontSize: 14,
    fontWeight: "700",
  },
});
