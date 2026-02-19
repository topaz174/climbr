import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, TextInput, Keyboard, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  useDerivedValue,
  interpolateColor,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CoinIcon } from "@/components/icons/CoinIcon";
import { BottomSheet, BottomSheetRef } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { WheelPicker } from "@/components/WheelPicker";
import { Toggle } from "@/components/Toggle";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppColors, Spacing, BorderRadius, IconSizes, Typography } from "@/constants/theme";
import { IMMERSIVE_GRACE_SEC } from "@/constants/app";
import { useTimerStore, type Phase } from "@/stores/timerStore";
import { DevFeatures } from "@/components/DevFeatures"; // DELETE THIS LINE BEFORE PRODUCTION
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DIAL_SIZE = Math.min(SCREEN_WIDTH * 0.82, 380);
const INNER_CIRCLE_SIZE = DIAL_SIZE * 0.92;
const PROGRESS_RING_RADIUS = (DIAL_SIZE / 2) - 8;
const PROGRESS_STROKE_BASE = 12;
const PROGRESS_STROKE_WIDTH = PROGRESS_STROKE_BASE * 1.2;
const TAB_BAR_TOTAL_HEIGHT = 90;
const IMMERSIVE_CONTENT_SCALE = (1.2 + 1) / 2;
const FIRST_TIME_KEY = "@climbr_has_started_timer";
const FOCUS_MIN_MINUTES = 15;
const FOCUS_MAX_MINUTES = 120;
const BREAK_MIN_MINUTES = 5;
const BREAK_MAX_MINUTES = 30;
const STEP_MINUTES = 5;

/** Set to false to remove the icon from the dial center. */
const SHOW_DIAL_CENTER_PLACEHOLDER = true;

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
  const nextSessionIsBreak = useTimerStore((s) => s.nextSessionIsBreak);
  const coins = useTimerStore((s) => s.coins);
  const pendingCoinsAnimation = useTimerStore((s) => s.pendingCoinsAnimation);
  const autoStart = useTimerStore((s) => s.autoStart);

  const startSession = useTimerStore((s) => s.startSession);
  const clearPendingCoinsAnimation = useTimerStore((s) => s.clearPendingCoinsAnimation);
  const setDurations = useTimerStore((s) => s.setDurations);
  const openGiveUpConfirm = useTimerStore((s) => s.openGiveUpConfirm);
  const closeGiveUpConfirm = useTimerStore((s) => s.closeGiveUpConfirm);
  const confirmGiveUp = useTimerStore((s) => s.confirmGiveUp);
  const confirmProgressLost = useTimerStore((s) => s.confirmProgressLost);
  const skipBreak = useTimerStore((s) => s.skipBreak);

  const [showSkipBreakModal, setShowSkipBreakModal] = useState(false);
  const [showSessionCompleteModal, setShowSessionCompleteModal] = useState(false);
  const [coinsJustClaimed, setCoinsJustClaimed] = useState(0);

  const [isFirstTime, setIsFirstTime] = useState(true);
  const [smartBreakEnabled, setSmartBreakEnabled] = useState(false);
  const [draftFocusMinutes, setDraftFocusMinutes] = useState(Math.floor(focusDuration / 60));
  const [draftBreakMinutes, setDraftBreakMinutes] = useState(Math.floor(breakDuration / 60));
  const [timerPressed, setTimerPressed] = useState(false);

  const durationSheetRef = useRef<BottomSheetRef>(null);
  const lastTapTimeRef = useRef(0);
  const longPressResetJustHappenedRef = useRef(false);
  const handTranslateY = useSharedValue(0);

  // Derived state for immersive mode - fall is always immersive, climbing after IMMERSIVE_GRACE_SEC
  const isImmersive = useDerivedValue(() => {
    if (phase === "fall") return true;
    if (phase === "climbing") {
      const elapsedSeconds = focusDuration - timeRemaining;
      return elapsedSeconds >= IMMERSIVE_GRACE_SEC;
    }
    return false;
  }, [phase, timeRemaining, focusDuration]);

  const wasImmersiveRef = useRef(false);
  const isImmersiveNow = phase === "fall" || (phase === "climbing" && focusDuration - timeRemaining >= IMMERSIVE_GRACE_SEC);
  const immersionBgProgress = useSharedValue(isImmersiveNow ? 1 : 0);
  useEffect(() => {
    if (isImmersiveNow && !wasImmersiveRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    wasImmersiveRef.current = isImmersiveNow;
    immersionBgProgress.value = withTiming(isImmersiveNow ? 1 : 0, {
      duration: 700,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  }, [isImmersiveNow]);

  // Shared values for synchronized animations (400ms cubic)
  const ANIMATION_DURATION = 400;
  const ANIMATION_EASING = Easing.bezier(0.4, 0.0, 0.2, 1); // Cubic easing

  // Tab bar translate (slides down off-screen when immersive)
  const tabBarTranslateY = useDerivedValue(() => {
    return withTiming(isImmersive.value ? TAB_BAR_TOTAL_HEIGHT + 20 : 0, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  // Settings button translate (slides up off-screen when immersive) and opacity (fully disappear)
  const settingsButtonTranslateY = useDerivedValue(() => {
    return withTiming(isImmersive.value ? -100 : 0, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  const headerOpacity = useDerivedValue(() => {
    return withTiming(isImmersive.value ? 0 : 1, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  // Central container translate: non-immersive = shifted up; immersive = 0 (current non-immersive is the target)
  const CENTRAL_SHIFT_UP = 20;
  const centralContainerTranslateY = useDerivedValue(() => {
    const standardOffset = -CENTRAL_SHIFT_UP; // Shift up in non-immersive so circle/timer/altitude sit higher
    const immersiveOffset = 0; // Immersive = no extra shift (land at “perfect” position)
    return withTiming(isImmersive.value ? immersiveOffset : standardOffset, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  // Animated styles
  const animatedTabBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
  }));

  const animatedSettingsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsButtonTranslateY.value }],
    opacity: headerOpacity.value,
  }));

  const animatedCentralContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: centralContainerTranslateY.value }],
  }));

  // Immersive content scale - altitude and time grow by same amount in immersion (single source of truth)
  const immersiveContentScale = useDerivedValue(() => {
    return withTiming(isImmersive.value ? IMMERSIVE_CONTENT_SCALE : 1, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  const animatedImmersiveScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: immersiveContentScale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      immersionBgProgress.value,
      [0, 1],
      [AppColors.background, AppColors.backgroundImmersive]
    ),
  }));

  const ImmersiveScaledBlock = useCallback(({ children }: { children: React.ReactNode }) => (
    <Animated.View style={animatedImmersiveScaleStyle}>{children}</Animated.View>
  ), [animatedImmersiveScaleStyle]);

  const coinFlyX = useSharedValue(0);
  const coinFlyY = useSharedValue(0);
  const coinFlyOpacity = useSharedValue(0);
  const coinScale = useSharedValue(1);

  useEffect(() => {
    if (phase === "idle" && pendingCoinsAnimation > 0 && !autoStart) {
      setShowSessionCompleteModal(true);
    }
  }, [phase, pendingCoinsAnimation, autoStart]);

  const COIN_BOUNCE_SPRING = { damping: 18, stiffness: 400 };
  const runCoinFlyAndBounce = useCallback(() => {
    const flyStartLeft = SCREEN_WIDTH / 2 - 80;
    const flyEndX = 20 + 24 - flyStartLeft;
    const flyEndY = 72 - 110;
    coinFlyX.value = 0;
    coinFlyY.value = 0;
    coinFlyOpacity.value = 1;
    coinFlyX.value = withTiming(flyEndX, { duration: 700, easing: Easing.out(Easing.cubic) });
    coinFlyY.value = withTiming(flyEndY, { duration: 700, easing: Easing.out(Easing.cubic) });
    coinFlyOpacity.value = withDelay(400, withTiming(0, { duration: 350 }));
    coinScale.value = withDelay(
      500,
      withSequence(
        withSpring(1.2, COIN_BOUNCE_SPRING),
        withSpring(1, { damping: 22, stiffness: 400 })
      )
    );
  }, []);

  useEffect(() => {
    if (pendingCoinsAnimation <= 0 || !autoStart) return;
    runCoinFlyAndBounce();
    const t = setTimeout(clearPendingCoinsAnimation, 750);
    return () => clearTimeout(t);
  }, [pendingCoinsAnimation, autoStart, runCoinFlyAndBounce]);

  useEffect(() => {
    if (coinsJustClaimed <= 0) return;
    runCoinFlyAndBounce();
    const t = setTimeout(() => setCoinsJustClaimed(0), 750);
    return () => clearTimeout(t);
  }, [coinsJustClaimed, runCoinFlyAndBounce]);

  const animatedCoinFlyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: coinFlyX.value }, { translateY: coinFlyY.value }],
    opacity: coinFlyOpacity.value,
  }));

  const animatedCoinCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    if (phase === "climbing" || phase === "plateau") {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        openPhaseExitModal();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;
    }
  };

  const openPhaseExitModal = () => {
    if (phase === "climbing") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      openGiveUpConfirm();
    } else if (phase === "plateau") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowSkipBreakModal(true);
    }
  };

  const handleSkipBreakCancel = () => {
    setShowSkipBreakModal(false);
  };

  const handleSkipBreakConfirm = () => {
    setShowSkipBreakModal(false);
    skipBreak();
  };

  const handleLongPress = () => {
    if (phase === "climbing") {
      const elapsedSec = focusDuration - timeRemaining;
      if (elapsedSec < 10) longPressResetJustHappenedRef.current = true;
    }
    openPhaseExitModal();
  };

  const handleGiveUpConfirmCancel = () => {
    closeGiveUpConfirm();
  };

  const handleGiveUpConfirmRestart = () => {
    confirmGiveUp();
  };

  const handleProgressLostConfirm = () => {
    confirmProgressLost();
  };

  const handleSessionCompleteOK = () => {
    const amount = pendingCoinsAnimation;
    setShowSessionCompleteModal(false);
    clearPendingCoinsAnimation();
    if (amount > 0) setCoinsJustClaimed(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatAltitude = (meters: number) => {
    return Math.floor(meters);
  };

  // Calculate progress based on current phase (use display values when session-lost modal is open)
  const totalDuration = displayPhase === "plateau" || (displayPhase === "idle" && nextSessionIsBreak) ? breakDuration : focusDuration;
  const progress = 1 - displayTimeRemaining / totalDuration;
  const circumference = 2 * Math.PI * PROGRESS_RING_RADIUS;
  const strokeDashoffset = circumference * (1 - progress);

  // Phase labels per PRD (idle + nextSessionIsBreak = "ready for break")
  const getPhaseLabel = () => {
    if (displayPhase === "climbing") return "CLIMB";
    if (displayPhase === "plateau" || (displayPhase === "idle" && nextSessionIsBreak)) return "BREAK";
    return "CLIMB";
  };

  const elapsedClimbSec = displayPhase === "climbing" ? focusDuration - displayTimeRemaining : 0;
  const cancelSecondsLeft = Math.max(0, IMMERSIVE_GRACE_SEC - Math.floor(elapsedClimbSec));

  const accentColor = hardcoreMode ? AppColors.hardcoreRed : AppColors.primary;
  const breakAccentColor = AppColors.success; // Green for break phase

  return (
    <ThemeProvider accentColor={accentColor}>
      <StatusBar style="light" hidden={isImmersiveNow} />
      <Animated.View style={[styles.container, animatedContainerStyle, { paddingTop: insets.top }]}>
        {/* DELETE DEVFEATURES COMPONENT BEFORE PRODUCTION */}
        <DevFeatures />
      
      {/* Header - Coins (left of settings) + Settings button (animated, fully hidden in immersion) */}
      <Animated.View
        style={[styles.headerContainer, animatedSettingsStyle]}
        pointerEvents={phase === "fall" || (phase === "climbing" && focusDuration - timeRemaining >= IMMERSIVE_GRACE_SEC) ? "none" : "auto"}
      >
        <View style={styles.coinsRow}>
          <CoinIcon size={23} style={styles.coinIcon} />
          <Animated.Text style={[styles.coinCount, animatedCoinCountStyle]}>{coins}</Animated.Text>
        </View>
        <Pressable 
          style={styles.settingsButton} 
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate("Settings");
          }}
        >
          <Feather name="settings" size={IconSizes.md} color={AppColors.iconGray} />
        </Pressable>
      </Animated.View>

      {/* Flying +X when session ends: floats from center to coins, then bounce (auto start on: immediate; auto off: after closing claim modal) */}
      {((pendingCoinsAnimation > 0 && autoStart) || coinsJustClaimed > 0) ? (
        <View style={styles.coinFlyOverlay} pointerEvents="none">
          <Animated.View style={[styles.coinFlyTextWrap, animatedCoinFlyStyle]}>
            <Text style={[styles.coinFlyText, { color: AppColors.coinYellow }]}>
              +{coinsJustClaimed > 0 ? coinsJustClaimed : pendingCoinsAnimation}
            </Text>
          </Animated.View>
        </View>
      ) : null}
      
      <View style={styles.divider} />

      {/* Central Container - Altitude + Circle + Timer (animated) */}
      <Animated.View style={[styles.contentContainer, animatedCentralContainerStyle]}>
        {/* Altitude block: pill + label + value scale together in immersion */}
        <ImmersiveScaledBlock>
          <View style={styles.altitudePill}>
            <View style={styles.altitudeSection}>
              <ThemedText style={[
                styles.altitudeLabel,
                { color: (displayPhase === "plateau" || (displayPhase === "idle" && nextSessionIsBreak)) ? AppColors.success : accentColor }
              ]}>
                ALTITUDE
              </ThemedText>
              <View style={styles.altitudeValueContainer}>
                <Text style={styles.altitudeNumber}>
                  {formatAltitude(displayCheckpointMeters + (displayPhase === "climbing" || displayPhase === "fall" ? displaySessionMeters : 0))}
                </Text>
                <Text style={styles.altitudeUnit}>m</Text>
              </View>
            </View>
          </View>
        </ImmersiveScaledBlock>

        {/* Circle - Sisyphus Dial */}
        <Pressable
          onPress={handleDialPress}
          onLongPress={(phase === "climbing" || phase === "plateau") ? handleLongPress : undefined}
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
              stroke={(displayPhase === "plateau" || (displayPhase === "idle" && nextSessionIsBreak)) ? AppColors.success : accentColor}
              strokeWidth={PROGRESS_STROKE_WIDTH}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
            />
          </Svg>

          <View style={styles.innerCircle}>
            {SHOW_DIAL_CENTER_PLACEHOLDER ? (
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.dialCenterPlaceholder}
                resizeMode="contain"
              />
            ) : null}
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

        {/* Timer Group + cancel hint overlay (hint squeezes in above timer, no layout shift) */}
        <View style={styles.timerGroupWrapper}>
          {(displayPhase === "climbing" && cancelSecondsLeft >= 1) ? (
            <View style={styles.cancelHintOverlay} pointerEvents="none">
              <ThemedText style={styles.cancelHint}>{cancelSecondsLeft}s to cancel</ThemedText>
            </View>
          ) : null}
          <View style={styles.timerGroup}>
            <ImmersiveScaledBlock>
              <Pressable
                onPress={phase === "idle" ? openDurationSheet : undefined}
                onPressIn={() => phase === "idle" && setTimerPressed(true)}
                onPressOut={() => setTimerPressed(false)}
                hitSlop={{ top: 28, bottom: 28, left: 40, right: 40 }}
                style={styles.timerPressable}
              >
                <ThemedText style={[styles.timeText, { opacity: timerPressed ? 0.7 : 1 }]}>
                  {formatTime(displayTimeRemaining)}
                </ThemedText>
                <ThemedText style={[
                  styles.focusLabel,
                  (displayPhase === "plateau" || (displayPhase === "idle" && nextSessionIsBreak)) ? styles.breakLabel : { color: accentColor }
                ]}>
                  {getPhaseLabel()}
                </ThemedText>
              </Pressable>
            </ImmersiveScaledBlock>
          </View>
        </View>
      </Animated.View>

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
        message={hardcoreMode ? "Are you sure? Your altitude will go back to zero." : "Are you sure? You'll lose this climb and go back to your last checkpoint."}
        buttons={[
          { label: "Cancel", onPress: handleGiveUpConfirmCancel },
          { label: "Give up", onPress: handleGiveUpConfirmRestart, variant: "primary" },
        ]}
      />

      <ConfirmModal
        visible={showFallModal}
        onRequestClose={handleProgressLostConfirm}
        icon="alert-circle"
        title={hardcoreMode ? "You lost it all!" : "Session lost"}
        message={hardcoreMode ? `You lost ${formatAltitude(metersLostInFall)}m of progress. Your altitude is back to zero.` : `You lost ${formatAltitude(metersLostInFall)}m of progress. You're back at your last checkpoint.`}
        buttons={[
          { label: "OK", onPress: handleProgressLostConfirm, variant: "primary" },
        ]}
        singleButton
      />

      <ConfirmModal
        visible={showSessionCompleteModal}
        onRequestClose={handleSessionCompleteOK}
        icon="check-circle"
        iconColor={AppColors.success}
        title="Session complete!"
        messageNode={
          pendingCoinsAnimation > 0 ? (
            <View style={styles.sessionCompleteMessage}>
              <ThemedText style={styles.sessionCompleteText}>
                You climbed {formatAltitude(pendingCoinsAnimation)} m and earned
              </ThemedText>
              <View style={styles.sessionCompleteRow}>
                <CoinIcon size={20} style={styles.sessionCompleteCoin} />
                <ThemedText style={styles.sessionCompleteText}> {pendingCoinsAnimation}!</ThemedText>
              </View>
            </View>
          ) : null
        }
        buttons={[
          {
            label: "Claim coins",
            onPress: handleSessionCompleteOK,
            variant: "success",
          },
        ]}
        singleButton
      />

      <ThemeProvider accentColor={breakAccentColor}>
        <ConfirmModal
          visible={showSkipBreakModal}
          onRequestClose={handleSkipBreakCancel}
          icon="alert-circle"
          title="Skip break?"
          message="Are you sure you want to end your break early?"
          buttons={[
            { label: "Cancel", onPress: handleSkipBreakCancel },
            { label: "Skip", onPress: handleSkipBreakConfirm, variant: "primary" },
          ]}
        />
      </ThemeProvider>
      </Animated.View>
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
  
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  coinsRow: {
    position: "absolute",
    top: 72,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  coinIcon: {
    opacity: 0.95,
  },
  coinCount: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 21,
    color: AppColors.text,
    minWidth: 26,
  },
  sessionCompleteMessage: {
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCompleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sessionCompleteText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  sessionCompleteCoin: {
    marginRight: 4,
  },
  coinFlyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  coinFlyTextWrap: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - 80,
    top: 110,
  },
  coinFlyText: {
    fontSize: 22,
    fontWeight: "700",
  },
  settingsButton: {
    position: "absolute",
    top: 72,
    right: 20,
    padding: 8,
  },
  
  contentContainer: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: Spacing["2xl"],
    paddingBottom: TAB_BAR_TOTAL_HEIGHT + Spacing["3xl"],
  },
  
  altitudePill: {
    backgroundColor: AppColors.cardBackgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  altitudeSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  
  timerGroupWrapper: {
    position: "relative",
    marginTop: Spacing.xl,
  },
  cancelHintOverlay: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelHint: {
    ...Typography.tiny,
    fontSize: 16,
    lineHeight: 21,
    color: AppColors.textSecondary,
  },
  timerGroup: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  timerPressable: {
    alignItems: "center",
    gap: Spacing.xs,
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
  dialCenterPlaceholder: {
    position: "absolute",
    width: INNER_CIRCLE_SIZE * 0.82,
    height: INNER_CIRCLE_SIZE * 0.82,
    left: INNER_CIRCLE_SIZE * 0.09,
    top: INNER_CIRCLE_SIZE * 0.09,
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
  
  focusLabel: {
    ...Typography.timerLabel,
    textTransform: "uppercase" as const,
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
  altitudeLabel: {
    ...Typography.timerLabel,
    marginBottom: 4,
    textTransform: "uppercase" as const,
  },
  altitudeValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  altitudeNumber: {
    ...Typography.numberLarge,
    fontSize: 41, // 15% smaller than numberLarge (48)
    lineHeight: 48,
    color: AppColors.text,
  },
  altitudeUnit: {
    ...Typography.numberUnit,
    color: AppColors.text, // Same color as number
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
    ...Typography.small,
    color: AppColors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
