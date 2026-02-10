import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

type SquadTab = "my" | "public";

interface Squad {
  id: string;
  name: string;
  location: string;
  course: string;
  memberCount: number;
  isLive: boolean;
  duration: string;
}

const MOCK_SQUADS: Squad[] = [
  {
    id: "1",
    name: "Night Grind",
    location: "WALC Table 4",
    course: "CS 180",
    memberCount: 8,
    isLive: true,
    duration: "45m",
  },
  {
    id: "2",
    name: "Finals Prep",
    location: "Hicks Library",
    course: "MA 161",
    memberCount: 12,
    isLive: true,
    duration: "2h 12m",
  },
  {
    id: "3",
    name: "Deep Work Zone",
    location: "Stewart Center",
    course: "ECE 270",
    memberCount: 5,
    isLive: true,
    duration: "28m",
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type SquadsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SquadsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SquadsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<SquadTab>("my");

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.header}>
        <ThemedText type="h1" style={styles.title}>Squads</ThemedText>
        <Pressable
          style={styles.addButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("CreateSquad");
          }}
        >
          <Feather name="plus" size={24} color={AppColors.text} />
        </Pressable>
      </View>

      <View style={styles.tabContainer}>
        <TabButton
          label="My Squads"
          isActive={activeTab === "my"}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("my");
          }}
        />
        <TabButton
          label="Public"
          isActive={activeTab === "public"}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("public");
          }}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_SQUADS.map((squad) => (
          <SquadCard key={squad.id} squad={squad} />
        ))}
      </ScrollView>
    </View>
  );
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ label, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <ThemedText
        style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface SquadCardProps {
  squad: Squad;
}

function SquadCard({ squad }: SquadCardProps) {
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
      style={[styles.squadCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <ThemedText style={styles.squadName}>{squad.name}</ThemedText>
        <View style={styles.liveContainer}>
          {squad.isLive ? (
            <>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>LIVE</ThemedText>
            </>
          ) : null}
          <ThemedText style={styles.durationText}>{squad.duration}</ThemedText>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={14} color={AppColors.textSecondary} />
          <ThemedText style={styles.detailText}>{squad.location}</ThemedText>
        </View>
        <View style={styles.detailItem}>
          <Feather name="book-open" size={14} color={AppColors.textSecondary} />
          <ThemedText style={styles.detailText}>{squad.course}</ThemedText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.memberInfo}>
          <Feather name="users" size={16} color={AppColors.textSecondary} />
          <ThemedText style={styles.memberCount}>{squad.memberCount}</ThemedText>
        </View>
        <Pressable
          style={styles.joinButton}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        >
          <ThemedText style={styles.joinButtonText}>JOIN</ThemedText>
        </Pressable>
      </View>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: AppColors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  tabButtonActive: {
    backgroundColor: AppColors.cardBackgroundLight,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  tabButtonTextActive: {
    color: AppColors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.tabBarHeight + Spacing["3xl"],
    gap: Spacing.lg,
  },
  squadCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  squadName: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.text,
  },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.primary,
  },
  durationText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginLeft: Spacing.xs,
  },
  cardDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  memberCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  joinButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.text,
  },
});
