import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useTimerStore } from "@/stores/timerStore";
import { TIMER_CONSTANTS } from "@/stores/timerStore";

async function requestNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

async function notifyBoulderSlipping() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    console.log("[TimerSync] Notification permission not granted");
    return;
  }
  console.log("[TimerSync] Sending 'boulder slipping' notification");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "The boulder is slipping!",
      body: "Return to Climbr to keep your climb.",
    },
    trigger: null,
  });
  console.log("[TimerSync] Notification sent successfully");
}

/**
 * Runs timer tick and AppState handling so the timer keeps running
 * even when the user is on another tab (e.g. Profile).
 * Mount once in App.tsx.
 */
export function TimerSync() {
  const phase = useTimerStore((s) => s.phase);
  const endTimestamp = useTimerStore((s) => s.endTimestamp);
  const fallStartTimeRemaining = useTimerStore((s) => s.fallStartTimeRemaining);
  const focusDuration = useTimerStore((s) => s.focusDuration);
  const tick = useTimerStore((s) => s.tick);
  const fallBack = useTimerStore((s) => s.fallBack);
  const onAppForeground = useTimerStore((s) => s.onAppForeground);
  const restoreFromStorage = useTimerStore((s) => s.restoreFromStorage);

  const backgroundStartRef = useRef<number | null>(null);
  const fallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    restoreFromStorage();
    requestNotificationPermissions();
  }, [restoreFromStorage]);

  useEffect(() => {
    if ((phase !== "climbing" && phase !== "plateau") || !endTimestamp) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const scheduleNextTick = () => {
      const now = Date.now();
      const msUntilNextSecond = 1000 - (now % 1000);
      timeoutId = setTimeout(() => {
        tick();
        intervalId = setInterval(tick, 1000);
      }, msUntilNextSecond);
    };

    scheduleNextTick();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [phase, endTimestamp, tick]);

  useEffect(() => {
    if (phase !== "fall") {
      if (fallTimeoutRef.current) {
        clearTimeout(fallTimeoutRef.current);
        fallTimeoutRef.current = null;
      }
      if (fallAnimationRef.current) {
        cancelAnimationFrame(fallAnimationRef.current);
        fallAnimationRef.current = null;
      }
      return;
    }

    if (fallStartTimeRemaining === null) return;

    const startTime = Date.now();
    const timeStartValue = fallStartTimeRemaining;
    const timeEndValue = focusDuration;
    const metersStartValue = useTimerStore.getState().sessionMeters;
    const metersEndValue = 0;
    const duration = TIMER_CONSTANTS.FALL_DURATION_MS;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in curve (quadratic): starts slow, ends fast
      const easedProgress = progress * progress;
      
      const currentTime = timeStartValue + (timeEndValue - timeStartValue) * easedProgress;
      const currentMeters = metersStartValue + (metersEndValue - metersStartValue) * easedProgress;
      
      useTimerStore.setState({ 
        timeRemaining: Math.round(currentTime),
        sessionMeters: currentMeters,
      });

      if (progress < 1) {
        fallAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    fallTimeoutRef.current = setTimeout(() => {
      fallTimeoutRef.current = null;
      if (fallAnimationRef.current) {
        cancelAnimationFrame(fallAnimationRef.current);
        fallAnimationRef.current = null;
      }
      fallBack();
    }, TIMER_CONSTANTS.FALL_DURATION_MS);

    return () => {
      if (fallTimeoutRef.current) {
        clearTimeout(fallTimeoutRef.current);
        fallTimeoutRef.current = null;
      }
      if (fallAnimationRef.current) {
        cancelAnimationFrame(fallAnimationRef.current);
        fallAnimationRef.current = null;
      }
    };
  }, [phase, fallStartTimeRemaining, focusDuration, fallBack]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        if (backgroundStartRef.current) {
          onAppForeground(backgroundStartRef.current);
          backgroundStartRef.current = null;
        }
        return;
      }
      if (nextState === "background") {
        if (phase === "climbing") {
          notifyBoulderSlipping();
        }
        if (phase === "climbing" || phase === "plateau") {
          backgroundStartRef.current = Date.now();
        }
      }
    });
    return () => sub.remove();
  }, [phase, onAppForeground]);

  return null;
}
