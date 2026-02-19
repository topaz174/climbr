import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import TimerScreen from "@/screens/TimerScreen";
import SquadsScreen from "@/screens/SquadsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { IMMERSIVE_GRACE_SEC } from "@/constants/app";
import { useTimerStore } from "@/stores/timerStore";

export type MainTabParamList = {
  SquadsTab: undefined;
  TimerTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.View;

const CENTER_BUTTON_SIZE = 68;
const TAB_BAR_HEIGHT = 60;

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="TimerTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="SquadsTab" component={SquadsScreen} />
      <Tab.Screen name="TimerTab" component={TimerScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Spacing.sm);
  const isTimerActive = state.index === 1;
  
  // Subscribe to timer phase and time for immersive mode
  const phase = useTimerStore((s) => s.phase);
  const timeRemaining = useTimerStore((s) => s.timeRemaining);
  const focusDuration = useTimerStore((s) => s.focusDuration);

  // Derived state for immersive mode - fall is always immersive, climbing after 10 seconds
  const isImmersive = useDerivedValue(() => {
    if (phase === "fall") return true;
    if (phase === "climbing") {
      const elapsedSeconds = (focusDuration - timeRemaining);
      return elapsedSeconds >= IMMERSIVE_GRACE_SEC;
    }
    return false;
  }, [phase, timeRemaining, focusDuration]);

  // Animation config - same as TimerScreen for synchronization
  const ANIMATION_DURATION = 400;
  const ANIMATION_EASING = Easing.bezier(0.4, 0.0, 0.2, 1); // Cubic easing
  const TAB_BAR_TOTAL_HEIGHT = TAB_BAR_HEIGHT + bottomPadding;

  // Tab bar translate (slides down off-screen when immersive) and opacity (fully disappear, no glow)
  const tabBarTranslateY = useDerivedValue(() => {
    return withTiming(isImmersive.value ? TAB_BAR_TOTAL_HEIGHT + 20 : 0, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  const tabBarOpacity = useDerivedValue(() => {
    return withTiming(isImmersive.value ? 0 : 1, {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    });
  });

  const animatedTabBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
    opacity: tabBarOpacity.value,
  }));

  const isImmersiveMode = phase === "fall" || (phase === "climbing" && (focusDuration - timeRemaining) >= IMMERSIVE_GRACE_SEC);

  return (
    <Animated.View
      style={[styles.tabBarContainer, { paddingBottom: bottomPadding }, animatedTabBarStyle]}
      pointerEvents={isImmersiveMode ? "none" : "auto"}
    >
      <View style={styles.topDivider} />
      
      {Platform.OS === "ios" ? (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: AppColors.surfaceOpacity }]} />
      )}
      
      <View style={styles.tabBarContent}>
        <TabButton
          icon="users"
          label="SQUADS"
          isActive={state.index === 0}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate("SquadsTab");
          }}
        />

        <CenterTabButton
          isActive={isTimerActive}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate("TimerTab");
          }}
        />

        <TabButton
          icon="user"
          label="PROFILE"
          isActive={state.index === 2}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate("ProfileTab");
          }}
        />
      </View>
    </Animated.View>
  );
}

interface TabButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ icon, label, isActive, onPress }: TabButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const iconColor = isActive ? AppColors.text : "#5E5E5E";

  return (
    <AnimatedPressable
      style={[styles.tabButton, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Feather name={icon} size={22} color={iconColor} />
      <ThemedText style={[styles.tabLabel, { color: iconColor }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

interface CenterTabButtonProps {
  isActive: boolean;
  onPress: () => void;
}

function CenterTabButton({ isActive, onPress }: CenterTabButtonProps) {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    colorProgress.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ["#3A3A3A", "#FFFFFF"]
    );
    return {
      backgroundColor,
      shadowOpacity: colorProgress.value * 0.4,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      style={[styles.centerTabButton, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <AnimatedView style={[styles.centerButtonInner, animatedButtonStyle]}>
        <Feather 
          name="clock" 
          size={30} 
          color={isActive ? "#1A1A1A" : "#888888"} 
        />
      </AnimatedView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === "ios" ? "transparent" : AppColors.surfaceOpacity,
  },
  topDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(33, 33, 33, 0.6)",
    zIndex: 10,
  },
  tabBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: TAB_BAR_HEIGHT,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  centerTabButton: {
    marginTop: -CENTER_BUTTON_SIZE * 0.35,
  },
  centerButtonInner: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 15,
  },
});
