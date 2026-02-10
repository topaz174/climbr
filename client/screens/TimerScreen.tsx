import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Dimensions, Modal, AppState, AppStateStatus } from "react-native";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.82, 380);
const INNER_CIRCLE_SIZE = DIAL_SIZE * 0.92;
const PROGRESS_RING_RADIUS = (DIAL_SIZE / 2) - 8;
const PROGRESS_STROKE_WIDTH = 12;
const TAB_BAR_TOTAL_HEIGHT = 90;
const FIRST_TIME_KEY = "@climbr_has_started_timer";
const LOCK_BLIP_MS = 100;
const RESET_AFTER_BACKGROUND_MS = 5000;
const DEFAULT_FOCUS_SEC = 30 * 60;

type SessionMode = "Solo" | "Room";
type TimerPhase = "focus" | "break";

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

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<SessionMode>("Solo");
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("focus");
  const [timeRemaining, setTimeRemaining] = useState(20 * 60 + 44);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [todayMinutes] = useState(45);
  const [weekHours] = useState(3);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  
  const lastTapRef = useRef<number>(0);
  const [savedTimeRemaining, setSavedTimeRemaining] = useState<number | null>(null);
  const [isInTestMode, setIsInTestMode] = useState(false);

  const lastActiveAt = useRef<number>(Date.now());
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handTranslateY = useSharedValue(0);
  const handOpacity = useSharedValue(1);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        lastActiveAt.current = Date.now();
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
        return;
      }
      if (nextState === "background") {
        const msSinceActive = Date.now() - lastActiveAt.current;
        if (msSinceActive > LOCK_BLIP_MS) {
          resetTimeoutRef.current = setTimeout(() => {
            resetTimeoutRef.current = null;
            setIsRunning(false);
            setPhase("focus");
            setTotalTime(DEFAULT_FOCUS_SEC);
            setTimeRemaining(DEFAULT_FOCUS_SEC);
            setIsInTestMode(false);
            setSavedTimeRemaining(null);
          }, RESET_AFTER_BACKGROUND_MS);
        }
      }
    });
    return () => {
      sub.remove();
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasStarted = await AsyncStorage.getItem(FIRST_TIME_KEY);
        setIsFirstTime(hasStarted === null);
      } catch (error) {
        console.error("Error checking first time:", error);
      }
    };
    
    checkFirstTime();
  }, []);

  useEffect(() => {
    if (isFirstTime && !isRunning) {
      handTranslateY.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [isFirstTime, isRunning]);

  const toggleTimer = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isFirstTime && !isRunning) {
      try {
        await AsyncStorage.setItem(FIRST_TIME_KEY, "true");
        setIsFirstTime(false);
      } catch (error) {
        console.error("Error saving first time:", error);
      }
    }
    
    setIsRunning((prev) => !prev);
  }, [isFirstTime, isRunning]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 50);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 100);
    setShowResetModal(true);
  }, []);

  const handleReset = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    setPhase("focus");
    setTotalTime(25 * 60);
    setTimeRemaining(25 * 60);
    setIsInTestMode(false);
    setSavedTimeRemaining(null);
    setShowResetModal(false);
  }, []);

  const handleCancelReset = useCallback(() => {
    Haptics.selectionAsync();
    setShowResetModal(false);
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (isInTestMode) {
        setTimeRemaining(savedTimeRemaining!);
        setIsInTestMode(false);
        setSavedTimeRemaining(null);
      } else {
        setSavedTimeRemaining(timeRemaining);
        setTimeRemaining(5);
        setIsInTestMode(true);
      }
    }
    
    lastTapRef.current = now;
  }, [isInTestMode, savedTimeRemaining, timeRemaining]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      if (phase === "focus") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase("break");
        setTotalTime(5 * 60);
        setTimeRemaining(5 * 60);
        setIsInTestMode(false);
        setSavedTimeRemaining(null);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsRunning(false);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining, phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = 1 - timeRemaining / totalTime;
  const circumference = 2 * Math.PI * PROGRESS_RING_RADIUS;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Pressable style={[styles.container, { paddingTop: insets.top }]} onPress={handleDoubleTap}>
      {/* Mode Pill - positioned with flex */}
      <View style={styles.pillSection}>
        <Pressable
          style={styles.modeSelector}
          onPress={() => {
            Haptics.selectionAsync();
            setMode(mode === "Solo" ? "Room" : "Solo");
          }}
        >
          <View style={styles.modeDot} />
          <ThemedText style={styles.modeText}>Mode: {mode}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Main content area - containing both circle and text for proper distribution */}
      <View style={styles.contentContainer}>
        <Pressable
          onPress={toggleTimer}
          onLongPress={handleLongPress}
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
            {!isRunning && !isFirstTime ? (
              <View style={styles.pauseOverlay}>
                <Feather name="play" size={72} color="rgba(255, 255, 255, 0.5)" />
              </View>
            ) : null}
            {!isRunning && isFirstTime ? (
              <OnboardingHandIndicator translateY={handTranslateY} />
            ) : null}
          </View>
        </Pressable>

        {/* Text section - positioned relative to circle and footer */}
        <View style={styles.textSection}>
          <ThemedText style={[styles.focusLabel, phase === "break" && styles.breakLabel]}>
            {phase === "focus" ? "FOCUS" : "BREAK"}
          </ThemedText>
          <ThemedText style={styles.timeText}>{formatTime(timeRemaining)}</ThemedText>
          <View style={styles.statsRow}>
            <ThemedText style={styles.statText}>TODAY: {todayMinutes} MIN</ThemedText>
            <ThemedText style={styles.statDot}>·</ThemedText>
            <ThemedText style={styles.statText}>THIS WEEK: {weekHours}H</ThemedText>
          </View>
        </View>
      </View>

      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelReset}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Feather name="alert-circle" size={48} color={AppColors.primary} />
            <ThemedText style={styles.modalTitle}>Give Up?</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Are you sure you want to reset? You'll go back to your last checkpoint.
            </ThemedText>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelReset}
              >
                <ThemedText style={styles.modalButtonTextCancel}>Keep Going</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleReset}
              >
                <ThemedText style={styles.modalButtonTextConfirm}>Reset</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
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
});
