/**
 * Placeholder: app icon inside the timer dial circle.
 * To remove: delete this file and remove <DialCenterPlaceholder size={INNER_CIRCLE_SIZE} /> from TimerScreen.
 */
import React from "react";
import { Image, StyleSheet } from "react-native";

const SHOW_PLACEHOLDER = true;
const SCALE_UP = 1.56;

const iconSource = require("../../assets/images/icon.png");

interface DialCenterPlaceholderProps {
  size: number;
}

export function DialCenterPlaceholder({ size }: DialCenterPlaceholderProps) {
  if (!SHOW_PLACEHOLDER) return null;
  const imageSize = size * SCALE_UP;
  const offset = (imageSize - size) / 2;
  return (
    <Image
      source={iconSource}
      style={[styles.image, { width: imageSize, height: imageSize, left: -offset, top: -offset }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    position: "absolute",
  },
});
