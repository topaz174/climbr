import React, { useRef, useEffect, memo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { AppColors, Typography } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PICKER_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_WIDTH = 70;
const HALF_PICKER = PICKER_WIDTH / 2;

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

const PickerItem = memo(
  ({
    item,
    index,
    scrollX,
    suffix,
  }: {
    item: number;
    index: number;
    scrollX: SharedValue<number>;
    suffix: string;
  }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const distance = Math.abs(scrollX.value - index * ITEM_WIDTH);

      const scale = interpolate(
        distance,
        [0, ITEM_WIDTH, HALF_PICKER],
        [1.3, 0.9, 0.7]
      );

      const opacity = interpolate(
        distance,
        [0, HALF_PICKER / 4, HALF_PICKER / 2, HALF_PICKER * 0.75, HALF_PICKER],
        [1, 0.5, 0.2, 0.2, 0]
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <View style={styles.itemContainer}>
        <Animated.View style={animatedStyle}>
          <Text style={styles.itemText}>
            {item}
            <Text style={styles.suffixText}>{suffix}</Text>
          </Text>
        </Animated.View>
      </View>
    );
  }
);

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<number>);

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
  const isScrolling = useRef(false);
  const valueChangeFromScrollRef = useRef(false);

  const items = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i += step) arr.push(i);
    return arr;
  }, [min, max, step]);

  const selectedIndex = items.findIndex((item) => item === value);
  const lastIndex = useSharedValue(selectedIndex >= 0 ? selectedIndex : 0);

  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const setScrollingTrue = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const setScrollingFalse = useCallback(() => {
    isScrolling.current = false;
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / ITEM_WIDTH);
      if (index !== lastIndex.value) {
        lastIndex.value = index;
        runOnJS(triggerHaptic)();
      }
    },
    onBeginDrag: () => {
      runOnJS(setScrollingTrue)();
    },
    onEndDrag: () => {
      runOnJS(setScrollingFalse)();
    },
  });

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (disabled) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const newValue = items[clampedIndex];
      valueChangeFromScrollRef.current = true;
      if (newValue !== value) {
        onChange(newValue);
      }
      isScrolling.current = false;
    },
    [disabled, items, value, onChange]
  );

  useEffect(() => {
    if (valueChangeFromScrollRef.current) {
      valueChangeFromScrollRef.current = false;
      return;
    }
    const index = items.indexOf(value);
    if (index !== -1 && !isScrolling.current) {
      flatListRef.current?.scrollToOffset({
        offset: index * ITEM_WIDTH,
        animated: false,
      });
      scrollX.value = index * ITEM_WIDTH;
      lastIndex.value = index;
    }
  }, [value, items]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
  );

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item, index }) => (
          <PickerItem item={item} index={index} scrollX={scrollX} suffix={suffix} />
        )}
        style={styles.list}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: (PICKER_WIDTH - ITEM_WIDTH) / 2,
        }}
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEnabled={!disabled}
        getItemLayout={getItemLayout}
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
    overflow: "visible",
  },
  containerDisabled: {
    opacity: 0.5,
  },
  list: {
    overflow: "visible",
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    ...Typography.h2,
    color: AppColors.text,
  },
  suffixText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginLeft: 2,
  },
});
