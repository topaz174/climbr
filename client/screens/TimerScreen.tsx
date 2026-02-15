import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, Animated as RNAnimated, Easing as RNEasing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTimerStore } from "@/stores/timerStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.82, 380);
const INNER_CIRCLE_SIZE = DIAL_SIZE * 0.92;
const PROGRESS_RING_RADIUS = (DIAL_SIZE / 2) - 8;
const PROGRESS_STROKE_WIDTH = 12;
const TAB_BAR_TOTAL_HEIGHT = 90;
const FIRST_TIME_KEY = "@climbr_has_started_timer";

interface OnboardingHandIndicatorProps {
  translateY: ReturnType<typeof useSharedValue<number>>;
}

function OnboardingHandIndicator({ translateY }: OnboardingHandIndicatorProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.handIndicator, animatedStyle]}>
      <MaterialCommunityIcons name="hand-pointing-up" size={64} color="rgba(255, 255, 255, 0.6)" />
      <ThemedText style={styles.tapHint}>Tap to Start</ThemedText>
    </Animated.View>
  );
}

interface MeterPopupProps {
  x: number;
  screenHeight: number;
}

function MeterPopup({ x, screenHeight }: MeterPopupProps) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.sequence([
        RNAnimated.timing(translateY, {
          toValue: 30,
          duration: 800,
          easing: RNEasing.out(RNEasing.quad),
          useNativeDriver: true,
        }),
        RNAnimated.parallel([
          RNAnimated.timing(translateY, {
            toValue: 80,
            duration: 1000,
            easing: RNEasing.in(RNEasing.quad),
            useNativeDriver: true,
          }),
          RNAnimated.timing(opacity, {
            toValue: 0,
            duration: 800,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <RNAnimated.View
      style={[
        styles.meterPopup,
        {
          left: x,
          top: screenHeight * 0.4,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <ThemedText style={styles.meterPopupText}>+1m</ThemedText>
    </RNAnimated.View>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  
  const phase = useTimerStore((s) => s.phase);
  const timeRemaining = useTimerStore((s) => s.timeRemaining);
  const focusDuration = useTimerStore((s) => s.focusDuration);
  const breakDuration = useTimerStore((s) => s.breakDuration);
  const sessionMeters = useTimerStore((s) => s.sessionMeters);
  const checkpointMeters = useTimerStore((s) => s.checkpointMeters);
  const lifetimeElevation = useTimerStore((s) => s.lifetimeElevation);
  const showGiveUpConfirmModal = useTimerStore((s) => s.showGiveUpConfirmModal);
  const showFallModal = useTimerStore((s) => s.showFallModal);
  const metersLostInFall = useTimerStore((s) => s.metersLostInFall);

  const startSession = useTimerStore((s) => s.startSession);
  const openGiveUpConfirm = useTimerStore((s) => s.openGiveUpConfirm);
  const closeGiveUpConfirm = useTimerStore((s) => s.closeGiveUpConfirm);
  const confirmGiveUp = useTimerStore((s) => s.confirmGiveUp);
  const confirmProgressLost = useTimerStore((s) => s.confirmProgressLost);

  const [isFirstTime, setIsFirstTime] = useState(true);
  const prevPhaseRef = useRef(phase);
  const lastTapTimeRef = useRef(0);
  const prevMetersRef = useRef(0);
  const [meterPopups, setMeterPopups] = useState<Array<{ id: number; x: number }>>([]);
  const handTranslateY = useSharedValue(0);

  useEffect(() => {
    (async () => {
      try {
        const hasStarted = await AsyncStorage.getItem(FIRST_TIME_KEY);
        setIsFirstTime(hasStarted === null);
      } catch (error) {
        console.error("Error checking first time:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (phase === "plateau" && prevPhaseRef.current === "climbing") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (phase === "idle" && prevPhaseRef.current === "plateau") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (isFirstTime && phase === "idle") {
      handTranslateY.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [isFirstTime, phase]);

  useEffect(() => {
    if (phase !== "climbing") {
      prevMetersRef.current = 0;
      return;
    }

    const currentMeters = Math.floor(sessionMeters);
    const prevMeters = prevMetersRef.current;

    if (currentMeters > prevMeters && currentMeters > 0) {
      const newId = Date.now();
      const randomX = SCREEN_WIDTH * 0.3 + Math.random() * SCREEN_WIDTH * 0.4;
      
      setMeterPopups((prev) => [...prev, { id: newId, x: randomX }]);

      setTimeout(() => {
        setMeterPopups((prev) => prev.filter((p) => p.id !== newId));
      }, 2000);
    }

    prevMetersRef.current = currentMeters;
  }, [sessionMeters, phase]);

  const handleStart = async () => {
    if (phase !== "idle") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isFirstTime) {
      try {
        await AsyncStorage.setItem(FIRST_TIME_KEY, "true");
        setIsFirstTime(false);
      } catch (error) {
        console.error("Error saving first time:", error);
      }
    }
    await startSession();
  };

  const handleDialPress = () => {
    if (phase === "idle") {
      handleStart();
      return;
    }
    if (phase === "climbing") {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        openGiveUpConfirm();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;
    }
  };

  const handleLongPress = () => {
    if (phase !== "climbing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    openGiveUpConfirm();
  };

  const handleGiveUpConfirmCancel = () => {
    Haptics.selectionAsync();
    closeGiveUpConfirm();
  };

  const handleGiveUpConfirmRestart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    confirmGiveUp();
  };

  const handleProgressLostConfirm = () => {
    Haptics.selectionAsync();
    confirmProgressLost();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatAltitude = (meters: number) => {
    return `${Math.floor(meters)}m`;
  };

  // Calculate progress based on current phase
  const totalDuration = phase === "plateau" ? breakDuration : focusDuration;
  const progress = 1 - timeRemaining / totalDuration;
  const circumference = 2 * Math.PI * PROGRESS_RING_RADIUS;
  const strokeDashoffset = circumference * (1 - progress);

  // Phase labels per PRD
  const getPhaseLabel = () => {
    if (phase === "climbing") return "FOCUS";
    if (phase === "plateau") return "BREAK";
    return "FOCUS";
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {meterPopups.map((popup) => (
        <MeterPopup key={popup.id} x={popup.x} screenHeight={Dimensions.get("window").height} />
      ))}
      <View style={styles.divider} />

      {/* Main content area - containing both circle and text for proper distribution */}
      <View style={styles.contentContainer}>
        <Pressable
          onPress={handleDialPress}
          onLongPress={phase === "climbing" ? handleLongPress : undefined}
          delayLongPress={600}
          pressRetentionOffset={{ top: 50, left: 50, right: 50, bottom: 50 }}
          style={styles.dialWrapper}
        >
          <View style={styles.outerRing} />
          <View style={styles.middleRing} />
          
          <Svg
            width={DIAL_SIZE}
            height={DIAL_SIZE}
            style={styles.progressSvg}
          >
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              stroke="rgba(42, 42, 42, 0.8)"
              strokeWidth={PROGRESS_STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              stroke={AppColors.primary}
              strokeWidth={PROGRESS_STROKE_WIDTH}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
            />
          </Svg>

          <View style={styles.innerCircle}>
            {phase === "idle" && !isFirstTime ? (
              <View style={styles.pauseOverlay}>
                <Feather name="play" size={72} color="rgba(255, 255, 255, 0.5)" />
              </View>
            ) : null}
            {phase === "idle" && isFirstTime ? (
              <OnboardingHandIndicator translateY={handTranslateY} />
            ) : null}
          </View>
        </Pressable>

        {/* Text section - positioned relative to circle and footer */}
        <View style={styles.textSection}>
          <ThemedText style={[styles.focusLabel, phase === "plateau" && styles.breakLabel]}>
            {getPhaseLabel()}
          </ThemedText>
          <ThemedText style={styles.timeText}>{formatTime(timeRemaining)}</ThemedText>
          <View style={styles.statsRow}>
            <ThemedText style={styles.statText}>CURRENT: {formatAltitude(checkpointMeters + (phase === "climbing" || phase === "fall" ? sessionMeters : 0))}</ThemedText>
            <ThemedText style={styles.statDot}>·</ThemedText>
            <ThemedText style={styles.statText}>LIFETIME: {formatAltitude(lifetimeElevation)}</ThemedText>
          </View>
        </View>
      </View>

      <Modal
        visible={showGiveUpConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleGiveUpConfirmCancel}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Feather name="alert-circle" size={48} color={AppColors.primary} />
            <ThemedText style={styles.modalTitle}>Give up?</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Are you sure? You'll lose this climb and go back to your last checkpoint.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleGiveUpConfirmCancel}
              >
                <ThemedText style={styles.modalButtonTextCancel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleGiveUpConfirmRestart}
              >
                <ThemedText style={styles.modalButtonTextConfirm}>Give up</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFallModal}
        transparent
        animationType="fade"
        onRequestClose={handleProgressLostConfirm}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Feather name="alert-circle" size={48} color={AppColors.primary} />
            <ThemedText style={styles.modalTitle}>Session lost</ThemedText>
            <ThemedText style={styles.modalMessage}>
              You lost {formatAltitude(metersLostInFall)} of progress. You're back at your last checkpoint.
            </ThemedText>
            <View style={styles.modalOkButtonWrap}>
              <Pressable
                style={[styles.modalButtonConfirm, styles.modalOkButton]}
                onPress={handleProgressLostConfirm}
              >
                <Text style={styles.modalButtonTextConfirm}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  
  pillSection: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  modeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(58, 58, 58, 0.5)",
    gap: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primary,
  },
  modeText: {
    color: "#E6E6E6",
    fontSize: 16,
    fontWeight: "600",
  },
  
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(33, 33, 33, 0.6)",
  },
  
  contentContainer: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingBottom: TAB_BAR_TOTAL_HEIGHT + Spacing["2xl"], // Increased bottom padding to push content up
  },
  dialWrapper: {
    width: DIAL_SIZE + 24,
    height: DIAL_SIZE + 24,
    justifyContent: "center",
    alignItems: "center",
  },
  outerRing: {
    position: "absolute",
    width: DIAL_SIZE + 24,
    height: DIAL_SIZE + 24,
    borderRadius: (DIAL_SIZE + 24) / 2,
    borderWidth: 8,
    borderColor: "rgba(0, 0, 0, 0.4)",
  },
  middleRing: {
    position: "absolute",
    width: DIAL_SIZE + 12,
    height: DIAL_SIZE + 12,
    borderRadius: (DIAL_SIZE + 12) / 2,
    borderWidth: 4,
    borderColor: "rgba(42, 42, 42, 0.5)",
  },
  progressSvg: {
    position: "absolute",
  },
  innerCircle: {
    width: INNER_CIRCLE_SIZE,
    height: INNER_CIRCLE_SIZE,
    borderRadius: INNER_CIRCLE_SIZE / 2,
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: "rgba(40, 40, 40, 0.3)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: INNER_CIRCLE_SIZE / 2,
  },
  handIndicator: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  tapHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  
  textSection: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: -Spacing.xl, // Negative margin to pull it closer to the circle
  },
  focusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  breakLabel: {
    color: "#4CAF50",
  },
  timeText: {
    fontSize: 72,
    lineHeight: 84,
    fontWeight: "200",
    color: "#F3F3F3",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statText: {
    color: "#4D4D4D",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statDot: {
    color: "#4D4D4D",
    fontSize: 16,
    fontWeight: "600",
  },
  
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing["3xl"],
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.text,
  },
  modalMessage: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  modalOkButtonWrap: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  modalOkButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: AppColors.cardBackgroundLight,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalButtonConfirm: {
    backgroundColor: AppColors.primary,
  },
  modalButtonTextCancel: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextConfirm: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  meterPopup: {
    position: "absolute",
    zIndex: 1000,
  },
  meterPopupText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#00D9FF",
    textShadowColor: "rgba(0, 217, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
