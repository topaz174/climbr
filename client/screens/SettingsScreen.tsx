import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Toggle } from "@/components/Toggle";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTimerStore } from "@/stores/timerStore";

const HARDCORE_RED = "#B22222";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const autoStart = useTimerStore((s) => s.autoStart);
  const keepScreenOn = useTimerStore((s) => s.keepScreenOn);
  const hardcoreMode = useTimerStore((s) => s.hardcoreMode);
  const showHardcoreConfirmModal = useTimerStore((s) => s.showHardcoreConfirmModal);

  const toggleAutoStart = useTimerStore((s) => s.toggleAutoStart);
  const toggleKeepScreenOn = useTimerStore((s) => s.toggleKeepScreenOn);
  const requestHardcoreMode = useTimerStore((s) => s.requestHardcoreMode);
  const confirmHardcoreMode = useTimerStore((s) => s.confirmHardcoreMode);
  const cancelHardcoreMode = useTimerStore((s) => s.cancelHardcoreMode);

  const handleBack = () => {
    Haptics.selectionAsync();
    cancelHardcoreMode();
    navigation.goBack();
  };

  const handleToggleAutoStart = () => {
    Haptics.selectionAsync();
    toggleAutoStart();
  };

  const handleToggleKeepScreenOn = () => {
    Haptics.selectionAsync();
    toggleKeepScreenOn();
  };

  const handleToggleHardcore = () => {
    Haptics.selectionAsync();
    requestHardcoreMode(!hardcoreMode);
  };

  const handleCancelHardcore = () => {
    Haptics.selectionAsync();
    cancelHardcoreMode();
  };

  const handleConfirmHardcore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirmHardcoreMode();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={16} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={AppColors.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Timer</ThemedText>

          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Auto-start</ThemedText>
            <Toggle value={autoStart} onPress={handleToggleAutoStart} />
          </View>

          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Keep screen on</ThemedText>
            <Toggle value={keepScreenOn} onPress={handleToggleKeepScreenOn} />
          </View>

          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Hardcore mode</ThemedText>
            <Toggle value={hardcoreMode} onPress={handleToggleHardcore} activeColor={HARDCORE_RED} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App</ThemedText>
          <Pressable style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>About</ThemedText>
            <Feather name="chevron-right" size={20} color="rgba(180, 180, 180, 0.6)" />
          </Pressable>
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>Version</ThemedText>
            <ThemedText style={styles.settingValue}>1.0.0</ThemedText>
          </View>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showHardcoreConfirmModal}
        onRequestClose={handleCancelHardcore}
        icon="alert-triangle"
        iconColor={HARDCORE_RED}
        iconSize={56}
        title="Enable Hardcore Mode?"
        message="Failing or giving up will reset your altitude to 0m."
        buttons={[
          { label: "Cancel", onPress: handleCancelHardcore },
          { label: "Enable", onPress: handleConfirmHardcore, variant: "danger" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
    gap: Spacing["2xl"],
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 15,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
});
