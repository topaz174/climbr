import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function CreateSquadScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [course, setCourse] = useState("");

  const handleCreate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In a real app, this would make an API call
    navigation.goBack();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = name.length > 0 && course.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={AppColors.text} />
        </Pressable>
        <ThemedText type="h1" style={styles.title}>Create Squad</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>SQUAD NAME</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g. Night Grind"
              placeholderTextColor={AppColors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>COURSE</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS 180"
              placeholderTextColor={AppColors.textMuted}
              value={course}
              onChangeText={setCourse}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>LOCATION (OPTIONAL)</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g. WALC Table 4"
              placeholderTextColor={AppColors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.infoCard}>
            <Feather name="info" size={20} color={AppColors.textSecondary} />
            <ThemedText style={styles.infoText}>
              Your squad will be visible to others nearby. You'll be marked as the host.
            </ThemedText>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Pressable
            style={[styles.createButton, !isValid && styles.createButtonDisabled]}
            onPress={isValid ? handleCreate : undefined}
          >
            <ThemedText style={styles.createButtonText}>CREATE SQUAD</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing["2xl"],
  },
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: AppColors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: AppColors.cardBackgroundLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  infoText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  createButton: {
    backgroundColor: AppColors.primary,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: AppColors.cardBackgroundLight,
    opacity: 0.5,
  },
  createButtonText: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
