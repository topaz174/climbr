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
import { Button } from "@/components/Button";
import { WheelPicker } from "@/components/WheelPicker";
import { Toggle } from "@/components/Toggle";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppColors, Spacing, BorderRadius, IconSizes, Typography } from "@/constants/theme";
import { useTimerStore, type Phase } from "@/stores/timerStore";
import { DevFeatures } from "@/components/DevFeatures"; // DELETE THIS LINE BEFORE PRODUCTION
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

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
      <MaterialCommunityIcons name="hand-pointing-up" size={IconSizes["3xl"]} color={AppColors.iconLight} />
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

  const durationSheetRef = useRef<BottomSheetRef>(null);
  const prevPhaseRef = useRef(phase);
  const lastTapTimeRef = useRef(0);
  const longPressResetJustHappenedRef = useRef(false);
  const handTranslateY = useSharedValue(0);

  const [frozenDisplay, setFrozenDisplay] = useState<{
    timeRemaining: number;
    phase: Phase;
    checkpointMeters: number;
    sessionMeters: number;
  } | null>(null);

  useEffect(() => {
    if (showFallModal) {
      setFrozenDisplay({
        timeRemaining,
        phase,
        checkpointMeters,
        sessionMeters,
      });
    } else {
      setFrozenDisplay(null);
    }
  }, [showFallModal]);

  const displayTimeRemaining = showFallModal && frozenDisplay ? frozenDisplay.timeRemaining : timeRemaining;
  const displayPhase = showFallModal && frozenDisplay ? frozenDisplay.phase : phase;
  const displayCheckpointMeters = showFallModal && frozenDisplay ? frozenDisplay.checkpointMeters : checkpointMeters;
  const displaySessionMeters = showFallModal && frozenDisplay ? frozenDisplay.sessionMeters : sessionMeters;

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

  const handleFocusChange = (minutes: number) => {
    setDraftFocusMinutes(minutes);
    if (smartBreakEnabled) {
      const smartBreak = getSmartBreakMinutes(minutes);
      setDraftBreakMinutes(smartBreak);
    }
  };

  const handleBreakChange = (minutes: number) => {
    setDraftBreakMinutes(minutes);
    if (smartBreakEnabled) {
      setSmartBreakEnabled(false);
    }
  };

  const toggleSmartBreak = () => {
    const newEnabled = !smartBreakEnabled;
    setSmartBreakEnabled(newEnabled);
    if (newEnabled) {
      const smartBreak = getSmartBreakMinutes(draftFocusMinutes);
      setDraftBreakMinutes(smartBreak);
    }
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

  // Calculate progress based on current phase (use display values when session-lost modal is open)
  const totalDuration = displayPhase === "plateau" ? breakDuration : focusDuration;
  const progress = 1 - displayTimeRemaining / totalDuration;
  const circumference = 2 * Math.PI * PROGRESS_RING_RADIUS;
  const strokeDashoffset = circumference * (1 - progress);

  // Phase labels per PRD
  const getPhaseLabel = () => {
    if (displayPhase === "climbing") return "FOCUS";
    if (displayPhase === "plateau") return "BREAK";
    return "FOCUS";
  };

  const accentColor = hardcoreMode ? AppColors.hardcoreRed : AppColors.primary;

  return (
    <ThemeProvider accentColor={accentColor}>
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
        <Feather name="settings" size={IconSizes.md} color={AppColors.iconGray} />
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
              stroke={AppColors.progressRingBackground}
              strokeWidth={PROGRESS_STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              stroke={displayPhase === "plateau" ? AppColors.success : accentColor}
              strokeWidth={PROGRESS_STROKE_WIDTH}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
            />
          </Svg>

          <View style={styles.innerCircle}>
            {displayPhase === "idle" && !isFirstTime ? (
              <View style={styles.pauseOverlay}>
                <Feather name="play" size={IconSizes["4xl"]} color={AppColors.iconSubtle} />
              </View>
            ) : null}
            {displayPhase === "idle" && isFirstTime ? (
              <OnboardingHandIndicator translateY={handTranslateY} />
            ) : null}
          </View>
        </Pressable>

        {/* Text section - positioned relative to circle and footer */}
        <View style={styles.textSection}>
          <ThemedText style={[
            styles.focusLabel,
            displayPhase === "plateau" ? styles.breakLabel : { color: accentColor }
          ]}>
            {getPhaseLabel()}
          </ThemedText>
            <Pressable onPress={phase === "idle" ? openDurationSheet : undefined}>
              <ThemedText style={styles.timeText}>{formatTime(displayTimeRemaining)}</ThemedText>
            </Pressable>
          <View style={styles.statsRow}>
            <ThemedText style={styles.currentAltitudeText}>
              ALTITUDE: {formatAltitude(displayCheckpointMeters + (displayPhase === "climbing" || displayPhase === "fall" ? displaySessionMeters : 0))}
            </ThemedText>
          </View>
        </View>
      </View>

      <BottomSheet ref={durationSheetRef} onClose={closeDurationSheet}>
        <ThemeProvider accentColor={accentColor}>
          <ThemedText style={styles.sheetTitle}>Session Settings</ThemedText>

          <View style={styles.pickerSection}>
            <ThemedText style={styles.pickerLabel}>Focus Length</ThemedText>
            <WheelPicker
              value={draftFocusMinutes}
              onChange={handleFocusChange}
              min={FOCUS_MIN_MINUTES}
              max={FOCUS_MAX_MINUTES}
              step={5}
            />
          </View>

          <View style={styles.pickerSection}>
            <ThemedText style={styles.pickerLabel}>Break Length</ThemedText>
            <WheelPicker
              value={draftBreakMinutes}
              onChange={handleBreakChange}
              min={BREAK_MIN_MINUTES}
              max={BREAK_MAX_MINUTES}
              step={5}
              disabled={smartBreakEnabled}
            />
          </View>

          <View style={styles.smartBreakRow}>
            <ThemedText style={styles.smartBreakLabel}>Smart Break</ThemedText>
            <Toggle value={smartBreakEnabled} onPress={toggleSmartBreak} activeColor={accentColor} />
          </View>

          <View style={styles.sheetActions}>
            <Button variant="secondary" onPress={closeDurationSheet} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onPress={applyDurations} fullWidth>
              Apply
            </Button>
          </View>
        </ThemeProvider>
      </BottomSheet>

      <ConfirmModal
        visible={showGiveUpConfirmModal}
        onRequestClose={handleGiveUpConfirmCancel}
        icon="alert-circle"
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
        title="Session lost"
        message={`You lost ${formatAltitude(metersLostInFall)} of progress. You're back at your last checkpoint.`}
        buttons={[
          { label: "OK", onPress: handleProgressLostConfirm, variant: "primary" },
        ]}
        singleButton
      />
      </View>
    </ThemeProvider>
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
    backgroundColor: AppColors.cardBackgroundDark,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    gap: Spacing.md,
    shadowColor: AppColors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modeText: {
    color: AppColors.textGray,
    ...Typography.body,
    fontWeight: "600",
  },
  
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: AppColors.divider,
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
    borderColor: AppColors.borderDark,
  },
  middleRing: {
    position: "absolute",
    width: DIAL_SIZE + 12,
    height: DIAL_SIZE + 12,
    borderRadius: (DIAL_SIZE + 12) / 2,
    borderWidth: 4,
    borderColor: AppColors.borderMedium,
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
    borderColor: AppColors.borderLight,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppColors.overlay,
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
    ...Typography.small,
    fontWeight: "600",
    color: AppColors.iconSubtle,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  
  textSection: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: -Spacing.xl, // Negative margin to pull it closer to the circle
  },
  focusLabel: {
    ...Typography.timerLabel,
    textTransform: "uppercase",
    marginTop: Spacing.sm,
  },
  breakLabel: {
    color: AppColors.success,
  },
  timeText: {
    fontSize: 72,
    lineHeight: 84,
    fontWeight: "200",
    color: AppColors.textLight,
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
    ...Typography.bodySmall,
    color: AppColors.textDarkGray,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  sheetTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  pickerSection: {
    marginBottom: Spacing.md,
  },
  pickerLabel: {
    ...Typography.small,
    color: AppColors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  smartBreakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  smartBreakLabel: {
    ...Typography.body,
    color: AppColors.text,
    fontWeight: "500",
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
