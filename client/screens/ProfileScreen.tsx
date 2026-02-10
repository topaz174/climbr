import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WeeklyData {
  day: string;
  hours: number;
  isToday: boolean;
}

const WEEKLY_DATA: WeeklyData[] = [
  { day: "M", hours: 2, isToday: false },
  { day: "T", hours: 0, isToday: false },
  { day: "W", hours: 1.5, isToday: false },
  { day: "T", hours: 3, isToday: false },
  { day: "F", hours: 4, isToday: true },
  { day: "S", hours: 1, isToday: false },
  { day: "S", hours: 0.5, isToday: false },
];

const MAX_HOURS = Math.max(...WEEKLY_DATA.map((d) => d.hours));

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.header}>
        <ThemedText type="h1" style={styles.title}>Profile</ThemedText>
        <Pressable
          style={styles.settingsButton}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="settings" size={24} color={AppColors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader />
        <StatsRow />
        <WeeklyFocusCard />
        <ViewSquadsButton />
      </ScrollView>
    </View>
  );
}

function ProfileHeader() {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Feather name="user" size={36} color={AppColors.text} />
        </View>
      </View>
      <View style={styles.profileInfo}>
        <ThemedText style={styles.userName}>Alex Rivera</ThemedText>
        <ThemedText style={styles.userLevel}>Level 14 Peak Climber</ThemedText>
      </View>
    </View>
  );
}

function StatsRow() {
  return (
    <View style={styles.statsRow}>
      <StatCard
        icon="award"
        iconColor="#FFD700"
        value="120m"
        label="HIGHEST CLIMB"
      />
      <StatCard
        icon="trending-up"
        iconColor="#4CAF50"
        value="342m"
        label="TOTAL CLIMBED"
      />
    </View>
  );
}

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  value: string;
  label: string;
}

function StatCard({ icon, iconColor, value, label }: StatCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      style={[styles.statCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Feather name={icon} size={24} color={iconColor} style={styles.statIcon} />
      <ThemedText 
        type="h1" 
        style={styles.statValue}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value}
      </ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

function WeeklyFocusCard() {
  const chartWidth = SCREEN_WIDTH - Spacing.lg * 4;
  const barWidth = (chartWidth - Spacing.sm * 6) / 7;
  const chartHeight = 120;

  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklyHeader}>
        <ThemedText style={styles.weeklyTitle}>WEEKLY FOCUS</ThemedText>
        <Feather name="clock" size={18} color={AppColors.textSecondary} />
      </View>

      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {WEEKLY_DATA.map((data, index) => {
            const barHeight = MAX_HOURS > 0 ? (data.hours / MAX_HOURS) * (chartHeight - 30) : 0;
            const x = index * (barWidth + Spacing.sm);
            const y = chartHeight - barHeight - 25;

            return (
              <Rect
                key={data.day + index}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={data.hours > 0 ? (data.isToday ? AppColors.primary : AppColors.cardBackgroundLight) : AppColors.cardBackground}
              />
            );
          })}
        </Svg>
        <View style={styles.dayLabels}>
          {WEEKLY_DATA.map((data, index) => (
            <ThemedText
              key={data.day + index}
              style={[
                styles.dayLabel,
                { width: barWidth + Spacing.sm },
                data.isToday && styles.dayLabelActive,
              ]}
            >
              {data.day}
            </ThemedText>
          ))}
        </View>
      </View>
    </View>
  );
}

function ViewSquadsButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <AnimatedPressable
      style={[styles.squadsButton, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <ThemedText style={styles.squadsButtonText}>View All Squads</ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    color: AppColors.text,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: AppColors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.tabBarHeight + Spacing["3xl"],
    gap: Spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: AppColors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  userLevel: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statIcon: {
    marginBottom: Spacing.sm,
  },
  statValue: {
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textSecondary,
    letterSpacing: 1,
  },
  weeklyCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  weeklyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
    letterSpacing: 1,
  },
  chartContainer: {
    alignItems: "center",
  },
  dayLabels: {
    flexDirection: "row",
    marginTop: Spacing.sm,
  },
  dayLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  dayLabelActive: {
    color: AppColors.text,
    fontWeight: "600",
  },
  squadsButton: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  squadsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.black,
  },
});
