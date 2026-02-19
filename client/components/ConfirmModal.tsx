import React from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/contexts/ThemeContext";
import { AppColors, Spacing, BorderRadius, Typography } from "@/constants/theme";

interface ConfirmModalButton {
  label: string;
  onPress: () => void;
  variant?: "default" | "danger" | "primary" | "coin" | "success";
}

interface ConfirmModalProps {
  visible: boolean;
  onRequestClose: () => void;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconSize?: number;
  title: string;
  message?: string;
  messageNode?: React.ReactNode;
  buttons: ConfirmModalButton[];
  singleButton?: boolean;
}

export function ConfirmModal({
  visible,
  onRequestClose,
  icon = "alert-circle",
  iconColor,
  iconSize = 48,
  title,
  message,
  messageNode,
  buttons,
  singleButton = false,
}: ConfirmModalProps) {
  const { accentColor } = useTheme();
  const defaultIconColor = iconColor ?? accentColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onRequestClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Feather name={icon} size={iconSize} color={defaultIconColor} />
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          {messageNode != null ? (
            <View style={styles.modalMessageWrap}>{messageNode}</View>
          ) : message != null ? (
            <ThemedText style={styles.modalMessage}>{message}</ThemedText>
          ) : null}
          
          <View style={[styles.modalButtons, singleButton && styles.singleButtonContainer]}>
            {buttons.map((button, index) => (
              <Button
                key={index}
                variant={button.variant || "secondary"}
                onPress={button.onPress}
                fullWidth={!singleButton}
              >
                {button.label}
              </Button>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    ...Typography.modalTitle,
    color: AppColors.text,
  },
  modalMessageWrap: {
    width: "100%",
  },
  modalMessage: {
    ...Typography.body,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
    marginTop: Spacing.md,
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
});
