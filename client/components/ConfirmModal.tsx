import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface ConfirmModalButton {
  label: string;
  onPress: () => void;
  variant?: "default" | "danger" | "primary";
}

interface ConfirmModalProps {
  visible: boolean;
  onRequestClose: () => void;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconSize?: number;
  title: string;
  message: string;
  buttons: ConfirmModalButton[];
  singleButton?: boolean;
}

export function ConfirmModal({
  visible,
  onRequestClose,
  icon = "alert-circle",
  iconColor = AppColors.primary,
  iconSize = 48,
  title,
  message,
  buttons,
  singleButton = false,
}: ConfirmModalProps) {
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
          <Feather name={icon} size={iconSize} color={iconColor} />
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <ThemedText style={styles.modalMessage}>{message}</ThemedText>
          
          {singleButton ? (
            <View style={styles.modalOkButtonWrap}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary, styles.modalOkButton]}
                onPress={buttons[0].onPress}
              >
                <Text style={styles.modalButtonTextPrimary}>{buttons[0].label}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modalButtons}>
              {buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.modalButton,
                    button.variant === "danger" && styles.modalButtonDanger,
                    button.variant === "primary" && styles.modalButtonPrimary,
                    !button.variant && styles.modalButtonCancel,
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      button.variant === "danger" && styles.modalButtonTextDanger,
                      button.variant === "primary" && styles.modalButtonTextPrimary,
                      !button.variant && styles.modalButtonTextCancel,
                    ]}
                  >
                    {button.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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
  modalOkButtonWrap: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  modalOkButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: AppColors.cardBackground,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalButtonPrimary: {
    backgroundColor: AppColors.primary,
  },
  modalButtonDanger: {
    backgroundColor: "#B22222",
  },
  modalButtonTextCancel: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextPrimary: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  modalButtonTextDanger: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
