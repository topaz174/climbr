import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";

// Import all 59 frames statically
const frames = [
  require("../../animations/stickman/Timeline 1_00108000.png"),
  require("../../animations/stickman/Timeline 1_00108001.png"),
  require("../../animations/stickman/Timeline 1_00108002.png"),
  require("../../animations/stickman/Timeline 1_00108003.png"),
  require("../../animations/stickman/Timeline 1_00108004.png"),
  require("../../animations/stickman/Timeline 1_00108005.png"),
  require("../../animations/stickman/Timeline 1_00108006.png"),
  require("../../animations/stickman/Timeline 1_00108007.png"),
  require("../../animations/stickman/Timeline 1_00108008.png"),
  require("../../animations/stickman/Timeline 1_00108009.png"),
  require("../../animations/stickman/Timeline 1_00108010.png"),
  require("../../animations/stickman/Timeline 1_00108011.png"),
  require("../../animations/stickman/Timeline 1_00108012.png"),
  require("../../animations/stickman/Timeline 1_00108013.png"),
  require("../../animations/stickman/Timeline 1_00108014.png"),
  require("../../animations/stickman/Timeline 1_00108015.png"),
  require("../../animations/stickman/Timeline 1_00108016.png"),
  require("../../animations/stickman/Timeline 1_00108017.png"),
  require("../../animations/stickman/Timeline 1_00108018.png"),
  require("../../animations/stickman/Timeline 1_00108019.png"),
  require("../../animations/stickman/Timeline 1_00108020.png"),
  require("../../animations/stickman/Timeline 1_00108021.png"),
  require("../../animations/stickman/Timeline 1_00108022.png"),
  require("../../animations/stickman/Timeline 1_00108023.png"),
  require("../../animations/stickman/Timeline 1_00108024.png"),
  require("../../animations/stickman/Timeline 1_00108025.png"),
  require("../../animations/stickman/Timeline 1_00108026.png"),
  require("../../animations/stickman/Timeline 1_00108027.png"),
  require("../../animations/stickman/Timeline 1_00108028.png"),
  require("../../animations/stickman/Timeline 1_00108029.png"),
  require("../../animations/stickman/Timeline 1_00108030.png"),
  require("../../animations/stickman/Timeline 1_00108031.png"),
  require("../../animations/stickman/Timeline 1_00108032.png"),
  require("../../animations/stickman/Timeline 1_00108033.png"),
  require("../../animations/stickman/Timeline 1_00108034.png"),
  require("../../animations/stickman/Timeline 1_00108035.png"),
  require("../../animations/stickman/Timeline 1_00108036.png"),
  require("../../animations/stickman/Timeline 1_00108037.png"),
  require("../../animations/stickman/Timeline 1_00108038.png"),
  require("../../animations/stickman/Timeline 1_00108039.png"),
  require("../../animations/stickman/Timeline 1_00108040.png"),
  require("../../animations/stickman/Timeline 1_00108041.png"),
  require("../../animations/stickman/Timeline 1_00108042.png"),
  require("../../animations/stickman/Timeline 1_00108043.png"),
  require("../../animations/stickman/Timeline 1_00108044.png"),
  require("../../animations/stickman/Timeline 1_00108045.png"),
  require("../../animations/stickman/Timeline 1_00108046.png"),
  require("../../animations/stickman/Timeline 1_00108047.png"),
  require("../../animations/stickman/Timeline 1_00108048.png"),
  require("../../animations/stickman/Timeline 1_00108049.png"),
  require("../../animations/stickman/Timeline 1_00108050.png"),
  require("../../animations/stickman/Timeline 1_00108051.png"),
  require("../../animations/stickman/Timeline 1_00108052.png"),
  require("../../animations/stickman/Timeline 1_00108053.png"),
  require("../../animations/stickman/Timeline 1_00108054.png"),
  require("../../animations/stickman/Timeline 1_00108055.png"),
  require("../../animations/stickman/Timeline 1_00108056.png"),
  require("../../animations/stickman/Timeline 1_00108057.png"),
  require("../../animations/stickman/Timeline 1_00108058.png"),
];

interface StickmanAnimatorProps {
  isRunning: boolean;
  style?: ViewStyle;
  opacity?: number;
  scale?: number;
}

export function StickmanAnimator({ isRunning, style, opacity = 1, scale = 1 }: StickmanAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % frames.length);
      }, 33); // ~30fps
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  return (
    <View style={[style, { opacity, transform: [{ scale }] }]}>
      <Image
        source={frames[frameIndex]}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
