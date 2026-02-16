import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Text, FlatList, NativeScrollEvent, NativeSyntheticEvent, Dimensions } from "react-native";
import Animated, { useAnimatedStyle, interpolate, Extrapolate, useSharedValue } from "react-native-reanimated";
import { AppColors, Typography } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PICKER_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width
const ITEM_WIDTH = 60;

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

export function WheelPicker({
  value,
  onChange,
  min,
  max,
  step = 5,
  suffix = "m",
  disabled = false,
}: WheelPickerProps) {
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const items: number[] = [];
  for (let i = min; i <= max; i += step) {
    items.push(i);
  }

  const selectedIndex = items.findIndex((item) => item === value);

  useEffect(() => {
    if (selectedIndex >= 0) {
      const offset = selectedIndex * ITEM_WIDTH;
      flatListRef.current?.scrollToOffset({
        offset,
        animated: false,
      });
      scrollX.value = offset;
    }
  }, [value, selectedIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (disabled) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    onChange(items[clampedIndex]);
  };

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const AnimatedItem = () => {
      const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
          (index - 2) * ITEM_WIDTH,
          (index - 1.4) * ITEM_WIDTH, // 70% of the way
          (index - 1) * ITEM_WIDTH,
          index * ITEM_WIDTH,
          (index + 1) * ITEM_WIDTH,
          (index + 1.4) * ITEM_WIDTH, // 70% of the way
          (index + 2) * ITEM_WIDTH,
        ];

        const scale = interpolate(
          scrollX.value,
          inputRange,
          [0.75, 0.75, 0.9, 1.2, 0.9, 0.75, 0.75], // Magnifying glass effect
          Extrapolate.CLAMP
        );

        const opacity = interpolate(
          scrollX.value,
          inputRange,
          [0.3, 0.3, 0.6, 1, 0.6, 0.3, 0.3], // Fade ends at 70%
          Extrapolate.CLAMP
        );

        return {
          transform: [{ scale }],
          opacity,
        };
      });

      return (
        <Animated.View style={[styles.itemContainer, animatedStyle]}>
          <Text style={styles.itemText}>
            {item}
            <Text style={styles.suffixText}>{suffix}</Text>
          </Text>
        </Animated.View>
      );
    };

    return <AnimatedItem />;
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: (PICKER_WIDTH - ITEM_WIDTH) / 2,
        }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        scrollEnabled={!disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    height: 80,
    width: PICKER_WIDTH,
    alignSelf: "center",
    justifyContent: "center",
  },
  containerDisabled: {
    opacity: 0.5,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    ...Typography.h3,
    color: AppColors.text,
  },
  suffixText: {
    ...Typography.body,
    color: AppColors.textSecondary,
  },
});
