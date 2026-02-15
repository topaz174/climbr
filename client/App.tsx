import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TimerSync } from "@/components/TimerSync";
import { useTimerStore } from "@/stores/timerStore";
import { AppColors } from "@/constants/theme";

function logStateChange(
  appState: AppStateStatus,
  timerPhase: string,
  elapsedSec: string,
  trigger: "appState" | "timerPhase"
) {
  console.log(
    "[App] appState:",
    appState,
    "| timerPhase:",
    timerPhase,
    "|",
    elapsedSec,
    "s since last change",
    "(" + trigger + ")"
  );
}

export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastChangeAt = useRef<number>(Date.now());
  const prevTimerPhase = useRef(useTimerStore.getState().phase);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const now = Date.now();
      const elapsedSec = ((now - lastChangeAt.current) / 1000).toFixed(3);
      appState.current = nextState;
      lastChangeAt.current = now;
      logStateChange(appState.current, useTimerStore.getState().phase, elapsedSec, "appState");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = useTimerStore.subscribe((state) => {
      if (state.phase === prevTimerPhase.current) return;
      const now = Date.now();
      const elapsedSec = ((now - lastChangeAt.current) / 1000).toFixed(3);
      lastChangeAt.current = now;
      logStateChange(appState.current, state.phase, elapsedSec, "timerPhase");
      prevTimerPhase.current = state.phase;
    });
    return unsub;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <BottomSheetModalProvider>
              <KeyboardProvider>
                <TimerSync />
                <NavigationContainer>
                  <RootStackNavigator />
                </NavigationContainer>
                <StatusBar style="light" />
              </KeyboardProvider>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
});
