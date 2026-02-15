import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, TextInput, Keyboard } from "react-native";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BottomSheet, BottomSheetRef } from "@/components/BottomSheet";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTimerStore } from "@/stores/timerStore";
import { DevFeatures } from "@/components/DevFeatures"; // DELETE THIS LINE BEFORE PRODUCTION
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const HARDCORE_RED = "#B22222";
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.82, 380);
const INNER_CIRCLE_SIZE = DIAL_SIZE * 0.92;
const PROGRESS_RING_RADIUS = (DIAL_SIZE / 2) - 8;
const PROGRESS_STROKE_WIDTH = 12;
const TAB_BAR_TOTAL_HEIGHT = 90;
const FIRST_TIME_KEY = "@climbr_has_started_timer";
const FOCUS_MIN_MINUTES = 15;
const FOCUS_MAX_MINUTES = 120;
const BREAK_MIN_MINUTES = 5;
const BREAK_MAX_MINUTES = 30;
const STEP_MINUTES = 5;

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
  const navigation = useNavigation<NavigationProp>();
  
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
  const hardcoreMode = useTimerStore((s) => s.hardcoreMode);

  const startSession = useTimerStore((s) => s.startSession);
  const setDurations = useTimerStore((s) => s.setDurations);
  const openGiveUpConfirm = useTimerStore((s) => s.openGiveUpConfirm);
  const closeGiveUpConfirm = useTimerStore((s) => s.closeGiveUpConfirm);
  const confirmGiveUp = useTimerStore((s) => s.confirmGiveUp);
  const confirmProgressLost = useTimerStore((s) => s.confirmProgressLost);

  const [isFirstTime, setIsFirstTime] = useState(true);
  const [smartBreakEnabled, setSmartBreakEnabled] = useState(false);
  const [draftFocusMinutes, setDraftFocusMinutes] = useState(Math.floor(focusDuration / 60));
  const [draftBreakMinutes, setDraftBreakMinutes] = useState(Math.floor(breakDuration / 60));
  const [focusEditText, setFocusEditText] = useState("");
  const [breakEditText, setBreakEditText] = useState("");

  const durationSheetRef = useRef<BottomSheetRef>(null);
  const prevPhaseRef = useRef(phase);
  const lastTapTimeRef = useRef(0);
  const longPressResetJustHappenedRef = useRef(false);
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


  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const getSmartBreakMinutes = (focusMinutes: number) => {
    if (focusMinutes <= 30) return 5;
    if (focusMinutes <= 50) return 10;
    if (focusMinutes <= 70) return 15;
    if (focusMinutes <= 90) return 20;
    if (focusMinutes <= 110) return 25;
    return 30;
  };

  const openDurationSheet = () => {
    if (phase !== "idle") return;
    const focusMin = Math.floor(focusDuration / 60);
    const breakMin = Math.floor(breakDuration / 60);
    setDraftFocusMinutes(focusMin);
    setDraftBreakMinutes(breakMin);
    setFocusEditText(String(focusMin));
    setBreakEditText(String(breakMin));
    durationSheetRef.current?.open();
  };

  const closeDurationSheet = () => {
    Keyboard.dismiss();
    durationSheetRef.current?.close();
  };

  const applyDurations = () => {
    setDurations(draftFocusMinutes * 60, draftBreakMinutes * 60);
    closeDurationSheet();
  };

  const adjustFocus = (delta: number) => {
    const nextFocus = clamp(draftFocusMinutes + delta, FOCUS_MIN_MINUTES, FOCUS_MAX_MINUTES);
    setDraftFocusMinutes(nextFocus);
    setFocusEditText(String(nextFocus));
    if (smartBreakEnabled) {
      const smartBreak = getSmartBreakMinutes(nextFocus);
      setDraftBreakMinutes(smartBreak);
      setBreakEditText(String(smartBreak));
    }
  };

  const adjustBreak = (delta: number) => {
    const nextBreak = clamp(draftBreakMinutes + delta, BREAK_MIN_MINUTES, BREAK_MAX_MINUTES);
    setDraftBreakMinutes(nextBreak);
    setBreakEditText(String(nextBreak));
  };

  const roundToNearestFive = (value: number) => Math.round(value / 5) * 5;

  const handleFocusEditEnd = () => {
    const parsed = parseInt(focusEditText, 10);
    if (isNaN(parsed)) {
      setFocusEditText(String(draftFocusMinutes));
      return;
    }
    const rounded = roundToNearestFive(parsed);
    const clamped = clamp(rounded, FOCUS_MIN_MINUTES, FOCUS_MAX_MINUTES);
    setDraftFocusMinutes(clamped);
    setFocusEditText(String(clamped));
    if (smartBreakEnabled) {
      const smartBreak = getSmartBreakMinutes(clamped);
      setDraftBreakMinutes(smartBreak);
      setBreakEditText(String(smartBreak));
    }
  };

  const handleBreakEditEnd = () => {
    const parsed = parseInt(breakEditText, 10);
    if (isNaN(parsed)) {
      setBreakEditText(String(draftBreakMinutes));
      return;
    }
    const rounded = roundToNearestFive(parsed);
    const clamped = clamp(rounded, BREAK_MIN_MINUTES, BREAK_MAX_MINUTES);
    setDraftBreakMinutes(clamped);
    setBreakEditText(String(clamped));
  };

  const handleFocusEditChange = (text: string) => {
    const filtered = text.replace(/[^0-9]/g, "").slice(0, 3);
    setFocusEditText(filtered);
  };

  const handleBreakEditChange = (text: string) => {
    const filtered = text.replace(/[^0-9]/g, "").slice(0, 3);
    setBreakEditText(filtered);
  };

  const toggleSmartBreak = () => {
    setSmartBreakEnabled((prev) => {
      const next = !prev;
      if (next) {
        const smartBreak = getSmartBreakMinutes(draftFocusMinutes);
        setDraftBreakMinutes(smartBreak);
        setBreakEditText(String(smartBreak));
      }
      return next;
    });
  };

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
      if (longPressResetJustHappenedRef.current) {
        longPressResetJustHappenedRef.current = false;
        return;
      }
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
    const elapsedSec = focusDuration - timeRemaining;
    if (elapsedSec < 10) longPressResetJustHappenedRef.current = true;
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
      {/* DELETE DEVFEATURES COMPONENT BEFORE PRODUCTION */}
      <DevFeatures />
      
      <Pressable 
        style={styles.settingsButton} 
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate("Settings");
        }}
      >
        <Feather name="settings" size={24} color="rgba(180, 180, 180, 0.8)" />
      </Pressable>
      
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
              stroke={phase === "plateau" ? "#4CAF50" : (hardcoreMode ? HARDCORE_RED : AppColors.primary)}
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
          <ThemedText style={[styles.focusLabel, phase === "plateau" && styles.breakLabel, hardcoreMode && phase !== "plateau" && styles.hardcoreLabel]}>
            {getPhaseLabel()}
          </ThemedText>
            <Pressable onPress={phase === "idle" ? openDurationSheet : undefined}>
              <ThemedText style={styles.timeText}>{formatTime(timeRemaining)}</ThemedText>
            </Pressable>
          <View style={styles.statsRow}>
            <ThemedText style={styles.currentAltitudeText}>
              ALTITUDE: {formatAltitude(checkpointMeters + (phase === "climbing" || phase === "fall" ? sessionMeters : 0))}
            </ThemedText>
          </View>
        </View>
      </View>

      <BottomSheet ref={durationSheetRef} snapPoints={["60%"]} onClose={closeDurationSheet}>
        <ThemedText style={styles.sheetTitle}>Session Settings</ThemedText>

            <View style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Focus Length</ThemedText>
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepperButton} onPress={() => adjustFocus(-STEP_MINUTES)}>
                  <Text style={styles.stepperButtonText}>-5</Text>
                </Pressable>
                <View style={styles.valueEditWrap}>
                  <TextInput
                    style={styles.settingValueInput}
                    value={focusEditText}
                    onChangeText={handleFocusEditChange}
                    onBlur={handleFocusEditEnd}
                    onSubmitEditing={handleFocusEditEnd}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <Text style={styles.valueUnit}>m</Text>
                </View>
                <Pressable style={styles.stepperButton} onPress={() => adjustFocus(STEP_MINUTES)}>
                  <Text style={styles.stepperButtonText}>+5</Text>
                </Pressable>
              </View>
            </View>

            {!smartBreakEnabled ? (
              <View style={styles.settingRow}>
                <ThemedText style={styles.settingLabel}>Break Length</ThemedText>
                <View style={styles.stepperRow}>
                  <Pressable style={styles.stepperButton} onPress={() => adjustBreak(-STEP_MINUTES)}>
                    <Text style={styles.stepperButtonText}>-5</Text>
                  </Pressable>
                  <View style={styles.valueEditWrap}>
                    <TextInput
                      style={styles.settingValueInput}
                      value={breakEditText}
                      onChangeText={handleBreakEditChange}
                      onBlur={handleBreakEditEnd}
                      onSubmitEditing={handleBreakEditEnd}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                    <Text style={styles.valueUnit}>m</Text>
                  </View>
                  <Pressable style={styles.stepperButton} onPress={() => adjustBreak(STEP_MINUTES)}>
                    <Text style={styles.stepperButtonText}>+5</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable style={styles.smartBreakRow} onPress={toggleSmartBreak}>
              <ThemedText style={styles.settingLabel}>Smart Break</ThemedText>
              <View style={[styles.smartPill, smartBreakEnabled && styles.smartPillActive]}>
                <Text style={[styles.smartPillText, smartBreakEnabled && styles.smartPillTextActive]}>
                  {smartBreakEnabled ? "ON" : "OFF"}
                </Text>
              </View>
            </Pressable>

        <View style={styles.sheetActions}>
          <Pressable style={[styles.sheetActionButton, styles.sheetActionCancel]} onPress={closeDurationSheet}>
            <Text style={styles.sheetActionCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.sheetActionButton, styles.sheetActionApply]} onPress={applyDurations}>
            <Text style={styles.sheetActionApplyText}>Apply</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <ConfirmModal
        visible={showGiveUpConfirmModal}
        onRequestClose={handleGiveUpConfirmCancel}
        icon="alert-circle"
        iconColor={AppColors.primary}
        title="Give up?"
        message="Are you sure? You'll lose this climb and go back to your last checkpoint."
        buttons={[
          { label: "Cancel", onPress: handleGiveUpConfirmCancel },
          { label: "Give up", onPress: handleGiveUpConfirmRestart, variant: "primary" },
        ]}
      />

      <ConfirmModal
        visible={showFallModal}
        onRequestClose={handleProgressLostConfirm}
        icon="alert-circle"
        iconColor={AppColors.primary}
        title="Session lost"
        message={`You lost ${formatAltitude(metersLostInFall)} of progress. You're back at your last checkpoint.`}
        buttons={[
          { label: "OK", onPress: handleProgressLostConfirm, variant: "primary" },
        ]}
        singleButton
      />
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
  settingsButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 9999,
    padding: 8,
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
  hardcoreLabel: {
    color: HARDCORE_RED,
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
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  currentAltitudeText: {
    color: "#4D4D4D",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  settingRow: {
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  valueEditWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 80,
    justifyContent: "center",
  },
  settingValueInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.text,
    minWidth: 48,
    padding: 0,
  },
  valueUnit: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.textSecondary,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  stepperButton: {
    backgroundColor: AppColors.cardBackgroundLight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  stepperButtonText: {
    color: AppColors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  smartBreakRow: {
    marginTop: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  smartPill: {
    minWidth: 54,
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.cardBackgroundLight,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  smartPillActive: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderColor: "#4CAF50",
  },
  smartPillText: {
    color: AppColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  smartPillTextActive: {
    color: "#4CAF50",
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  sheetActionButton: {
    flex: 1,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  sheetActionCancel: {
    backgroundColor: AppColors.cardBackgroundLight,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  sheetActionApply: {
    backgroundColor: AppColors.primary,
  },
  sheetActionCancelText: {
    color: AppColors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sheetActionApplyText: {
    color: AppColors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
