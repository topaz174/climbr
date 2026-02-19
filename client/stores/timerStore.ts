import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TIMER, STORAGE_KEYS } from "@/constants/app";

export type Phase = "idle" | "climbing" | "plateau" | "fall";

interface TimerState {
  phase: Phase;
  timeRemaining: number;
  focusDuration: number;
  breakDuration: number;
  sessionMeters: number;
  checkpointMeters: number;
  lifetimeElevation: number;
  endTimestamp: number | null;
  showGiveUpConfirmModal: boolean;
  showFallModal: boolean;
  metersLostInFall: number;
  fallStartTimeRemaining: number | null;
  autoStart: boolean;
  keepScreenOn: boolean;
  hardcoreMode: boolean;
  showHardcoreConfirmModal: boolean;
  /** When true, next startSession() starts break (plateau). Set when climb ends with autoStart off. */
  nextSessionIsBreak: boolean;
  coins: number;
  /** Set when climb ends with meters added; screen runs fly-in animation then clears. */
  pendingCoinsAnimation: number;
  /** True when the last phase transition was caused by tick() (timer reached 0). Used for alerts only. */
  transitionFromTick: boolean;
}

interface TimerActions {
  startSession: () => Promise<void>;
  setDurations: (focusSec: number, breakSec: number) => void;
  openGiveUpConfirm: () => void;
  closeGiveUpConfirm: () => void;
  confirmGiveUp: () => void;
  confirmProgressLost: () => void;
  skipBreak: () => void;
  fallBack: () => void;
  tick: () => void;
  syncFromEndTimestamp: () => void;
  onAppForeground: (backgroundStartTime: number, returnTime?: number) => void;
  restoreFromStorage: () => Promise<void>;
  toggleAutoStart: () => void;
  toggleKeepScreenOn: () => void;
  requestHardcoreMode: (enable: boolean) => void;
  confirmHardcoreMode: () => void;
  cancelHardcoreMode: () => void;
  clearPendingCoinsAnimation: () => void;
  clearTransitionFromTick: () => void;
  subtractTime: (seconds: number) => void;
}

const initialState: TimerState = {
  phase: "idle",
  timeRemaining: TIMER.DEFAULT_FOCUS_SEC,
  focusDuration: TIMER.DEFAULT_FOCUS_SEC,
  breakDuration: TIMER.DEFAULT_BREAK_SEC,
  sessionMeters: 0,
  checkpointMeters: 0,
  lifetimeElevation: 0,
  endTimestamp: null,
  showGiveUpConfirmModal: false,
  showFallModal: false,
  metersLostInFall: 0,
  fallStartTimeRemaining: null,
  autoStart: false,
  keepScreenOn: false,
  hardcoreMode: false,
  showHardcoreConfirmModal: false,
  nextSessionIsBreak: false,
  coins: 0,
  pendingCoinsAnimation: 0,
  transitionFromTick: false,
};

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  ...initialState,

  startSession: async () => {
    const { phase, focusDuration, breakDuration, nextSessionIsBreak } = get();
    if (phase !== "idle") return;

    if (nextSessionIsBreak) {
      const endBreakTime = Date.now() + breakDuration * 1000;
      set({
        phase: "plateau",
        timeRemaining: breakDuration,
        endTimestamp: endBreakTime,
        nextSessionIsBreak: false,
      });
      AsyncStorage.setItem(STORAGE_KEYS.END_TIMESTAMP, String(endBreakTime));
    } else {
      const endTime = Date.now() + focusDuration * 1000;
      set({
        phase: "climbing",
        timeRemaining: focusDuration,
        sessionMeters: 0,
        endTimestamp: endTime,
      });
      AsyncStorage.setItem(STORAGE_KEYS.END_TIMESTAMP, String(endTime));
    }
  },

  setDurations: (focusSec: number, breakSec: number) => {
    const { phase } = get();
    set({
      focusDuration: focusSec,
      breakDuration: breakSec,
      ...(phase === "idle" ? { timeRemaining: focusSec } : {}),
    });
  },

  openGiveUpConfirm: () => {
    const { phase, focusDuration, timeRemaining } = get();
    if (phase !== "climbing") return;

    const elapsedSec = focusDuration - timeRemaining;
    if (elapsedSec < TIMER.IMMERSIVE_GRACE_SEC) {
      AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
      set({
        phase: "idle",
        timeRemaining: focusDuration,
        sessionMeters: 0,
        endTimestamp: null,
      });
      return;
    }

    set({ showGiveUpConfirmModal: true });
  },

  closeGiveUpConfirm: () => set({ showGiveUpConfirmModal: false }),

  skipBreak: () => {
    const { phase, focusDuration } = get();
    if (phase !== "plateau") return;
    AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
    set({
      phase: "idle",
      endTimestamp: null,
      timeRemaining: focusDuration,
    });
  },

  confirmGiveUp: () => {
    const { timeRemaining, sessionMeters, hardcoreMode, checkpointMeters } = get();
    AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
    
    if (hardcoreMode) {
      AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT_METERS, "0");
    }
    
    set({
      showGiveUpConfirmModal: false,
      phase: "fall",
      endTimestamp: null,
      fallStartTimeRemaining: timeRemaining,
      metersLostInFall: hardcoreMode ? checkpointMeters + sessionMeters : sessionMeters,
    });
  },

  confirmProgressLost: () => {
    const { timeRemaining, hardcoreMode, checkpointMeters, sessionMeters } = get();
    
    if (hardcoreMode) {
      AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT_METERS, "0");
    }
    
    set({
      showFallModal: false,
      phase: "fall",
      fallStartTimeRemaining: timeRemaining,
      metersLostInFall: hardcoreMode ? checkpointMeters + sessionMeters : sessionMeters,
    });
  },

  fallBack: () => {
    const { focusDuration, hardcoreMode } = get();
    AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
    set({
      showFallModal: false,
      phase: "idle",
      timeRemaining: focusDuration,
      sessionMeters: 0,
      endTimestamp: null,
      fallStartTimeRemaining: null,
      metersLostInFall: 0,
      ...(hardcoreMode ? { checkpointMeters: 0 } : {}),
    });
  },

  tick: () => {
    const { endTimestamp, phase, focusDuration, breakDuration } = get();
    if (!endTimestamp || (phase !== "climbing" && phase !== "plateau")) return;

    const remaining = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));

    if (phase === "climbing" && remaining > 0) {
      const elapsed = focusDuration - remaining;
      set({ timeRemaining: remaining, sessionMeters: elapsed / 60 });
      return;
    }

    if (phase === "climbing" && remaining === 0) {
      const { autoStart, coins } = get();
      const metersClimbed = Math.floor(focusDuration / 60);
      const newCheckpoint = get().checkpointMeters + metersClimbed;
      const newLifetime = get().lifetimeElevation + metersClimbed;
      const newCoins = coins + metersClimbed;
      AsyncStorage.setItem(STORAGE_KEYS.COINS, String(newCoins));

      if (autoStart) {
        const endBreakTime = Date.now() + breakDuration * 1000;
        AsyncStorage.setItem(STORAGE_KEYS.END_TIMESTAMP, String(endBreakTime));
        AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT_METERS, String(newCheckpoint));
        AsyncStorage.setItem(STORAGE_KEYS.LIFETIME_ELEVATION, String(newLifetime));
        set({
          phase: "plateau",
          timeRemaining: breakDuration,
          checkpointMeters: newCheckpoint,
          lifetimeElevation: newLifetime,
          endTimestamp: endBreakTime,
          coins: newCoins,
          pendingCoinsAnimation: metersClimbed,
          transitionFromTick: true,
        });
      } else {
        AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
        AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT_METERS, String(newCheckpoint));
        AsyncStorage.setItem(STORAGE_KEYS.LIFETIME_ELEVATION, String(newLifetime));
        set({
          phase: "idle",
          timeRemaining: breakDuration,
          checkpointMeters: newCheckpoint,
          lifetimeElevation: newLifetime,
          endTimestamp: null,
          nextSessionIsBreak: true,
          coins: newCoins,
          pendingCoinsAnimation: metersClimbed,
          transitionFromTick: true,
        });
      }
      return;
    }

    if (phase === "plateau" && remaining === 0) {
      const { autoStart } = get();
      AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
      
      if (autoStart) {
        const endTime = Date.now() + focusDuration * 1000;
        AsyncStorage.setItem(STORAGE_KEYS.END_TIMESTAMP, String(endTime));
        set({
          phase: "climbing",
          timeRemaining: focusDuration,
          sessionMeters: 0,
          endTimestamp: endTime,
          transitionFromTick: true,
        });
      } else {
        set({
          phase: "idle",
          timeRemaining: focusDuration,
          sessionMeters: 0,
          endTimestamp: null,
          transitionFromTick: true,
        });
      }
    } else if (phase === "plateau") {
      set({ timeRemaining: remaining });
    }
  },

  syncFromEndTimestamp: () => {
    const { endTimestamp, phase, focusDuration } = get();
    if (!endTimestamp || (phase !== "climbing" && phase !== "plateau")) return;
    const remaining = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
    if (phase === "climbing") {
      const elapsed = focusDuration - remaining;
      set({ timeRemaining: remaining, sessionMeters: Math.max(0, elapsed / 60) });
    } else {
      set({ timeRemaining: remaining });
    }
  },

  onAppForeground: (backgroundStartTime: number, returnTime: number = Date.now()) => {
    const { phase, sessionMeters, hardcoreMode, checkpointMeters } = get();
    const elapsedBackground = returnTime - backgroundStartTime;

    if (phase === "climbing" && elapsedBackground >= TIMER.BACKGROUND_GRACE_MS) {
      AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
      if (hardcoreMode) {
        AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT_METERS, "0");
      }
      set({
        showFallModal: true,
        metersLostInFall: hardcoreMode ? checkpointMeters + sessionMeters : sessionMeters,
        endTimestamp: null,
      });
      return;
    }

    get().syncFromEndTimestamp();
  },

  restoreFromStorage: async () => {
    const [rawEndTime, rawCheckpoint, rawLifetime, rawCoins, rawSettings] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.END_TIMESTAMP),
      AsyncStorage.getItem(STORAGE_KEYS.CHECKPOINT_METERS),
      AsyncStorage.getItem(STORAGE_KEYS.LIFETIME_ELEVATION),
      AsyncStorage.getItem(STORAGE_KEYS.COINS),
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
    ]);

    const savedCheckpoint = rawCheckpoint ? Number(rawCheckpoint) : 0;
    const savedLifetime = rawLifetime ? Number(rawLifetime) : 0;
    const savedCoins = rawCoins != null ? Number(rawCoins) : 0;
    const savedSettings = rawSettings ? JSON.parse(rawSettings) : {};

    set({
      checkpointMeters: savedCheckpoint,
      lifetimeElevation: savedLifetime,
      coins: savedCoins,
      autoStart: savedSettings.autoStart ?? false,
      keepScreenOn: savedSettings.keepScreenOn ?? false,
      hardcoreMode: savedSettings.hardcoreMode ?? false,
    });

    const savedEndTime = rawEndTime ? Number(rawEndTime) : null;
    if (!savedEndTime) return;

    const { focusDuration, breakDuration } = get();
    const remaining = Math.max(0, Math.floor((savedEndTime - Date.now()) / 1000));

    if (remaining > 0) {
      if (remaining > breakDuration) {
        const elapsed = focusDuration - remaining;
        set({
          phase: "climbing",
          timeRemaining: remaining,
          sessionMeters: elapsed / 60,
          endTimestamp: savedEndTime,
        });
      } else {
        set({
          phase: "plateau",
          timeRemaining: remaining,
          endTimestamp: savedEndTime,
        });
      }
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.END_TIMESTAMP);
    }
  },

  toggleAutoStart: () => {
    const { autoStart } = get();
    const newValue = !autoStart;
    set({ autoStart: newValue });
    AsyncStorage.getItem(STORAGE_KEYS.SETTINGS).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...settings, autoStart: newValue }));
    });
  },

  toggleKeepScreenOn: () => {
    const { keepScreenOn } = get();
    const newValue = !keepScreenOn;
    set({ keepScreenOn: newValue });
    AsyncStorage.getItem(STORAGE_KEYS.SETTINGS).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...settings, keepScreenOn: newValue }));
    });
  },

  requestHardcoreMode: (enable: boolean) => {
    if (enable) {
      set({ showHardcoreConfirmModal: true });
    } else {
      set({ hardcoreMode: false });
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS).then((raw) => {
        const settings = raw ? JSON.parse(raw) : {};
        AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...settings, hardcoreMode: false }));
      });
    }
  },

  confirmHardcoreMode: () => {
    set({ hardcoreMode: true, showHardcoreConfirmModal: false });
    AsyncStorage.getItem(STORAGE_KEYS.SETTINGS).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...settings, hardcoreMode: true }));
    });
  },

  cancelHardcoreMode: () => {
    set({ showHardcoreConfirmModal: false });
  },

  clearPendingCoinsAnimation: () => {
    set({ pendingCoinsAnimation: 0 });
  },

  clearTransitionFromTick: () => {
    set({ transitionFromTick: false });
  },

  subtractTime: (seconds: number) => {
    const { phase, timeRemaining, endTimestamp } = get();
    if (phase !== "climbing" && phase !== "plateau") return;
    const newRemaining = Math.max(0, timeRemaining - seconds);
    const newEndTimestamp = Date.now() + newRemaining * 1000;
    set({ timeRemaining: newRemaining, endTimestamp: newEndTimestamp });
    if (endTimestamp != null) {
      AsyncStorage.setItem(STORAGE_KEYS.END_TIMESTAMP, String(newEndTimestamp));
    }
  },
}));

/** Re-export for consumers (e.g. TimerSync) that need timer/storage constants. */
export const TIMER_CONSTANTS = {
  ...TIMER,
  ...STORAGE_KEYS,
};
