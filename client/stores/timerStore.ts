import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const END_TIMESTAMP_KEY = "@climbr_end_timestamp";
const CHECKPOINT_METERS_KEY = "@climbr_checkpoint_meters";
const LIFETIME_ELEVATION_KEY = "@climbr_lifetime_elevation";
const SETTINGS_KEY = "@climbr_settings";
const DEFAULT_FOCUS_SEC = 25 * 60;
const DEFAULT_BREAK_SEC = 5 * 60;
const BACKGROUND_GRACE_MS = 10000;

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
}

const FALL_DURATION_MS = 2000;

interface TimerActions {
  startSession: () => Promise<void>;
  setDurations: (focusSec: number, breakSec: number) => void;
  openGiveUpConfirm: () => void;
  closeGiveUpConfirm: () => void;
  confirmGiveUp: () => void;
  confirmProgressLost: () => void;
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
}

const initialState: TimerState = {
  phase: "idle",
  timeRemaining: DEFAULT_FOCUS_SEC,
  focusDuration: DEFAULT_FOCUS_SEC,
  breakDuration: DEFAULT_BREAK_SEC,
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
};

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  ...initialState,

  startSession: async () => {
    const { phase, focusDuration } = get();
    if (phase !== "idle") return;

    const endTime = Date.now() + focusDuration * 1000;
    set({
      phase: "climbing",
      timeRemaining: focusDuration,
      sessionMeters: 0,
      endTimestamp: endTime,
    });
    AsyncStorage.setItem(END_TIMESTAMP_KEY, String(endTime));
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
    if (elapsedSec < 10) {
      AsyncStorage.removeItem(END_TIMESTAMP_KEY);
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

  confirmGiveUp: () => {
    const { timeRemaining, sessionMeters, hardcoreMode, checkpointMeters } = get();
    AsyncStorage.removeItem(END_TIMESTAMP_KEY);
    
    if (hardcoreMode) {
      AsyncStorage.setItem(CHECKPOINT_METERS_KEY, "0");
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
      AsyncStorage.setItem(CHECKPOINT_METERS_KEY, "0");
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
    AsyncStorage.removeItem(END_TIMESTAMP_KEY);
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
      const metersClimbed = Math.floor(focusDuration / 60);
      const endBreakTime = Date.now() + breakDuration * 1000;
      const newCheckpoint = get().checkpointMeters + metersClimbed;
      const newLifetime = get().lifetimeElevation + metersClimbed;
      
      AsyncStorage.setItem(END_TIMESTAMP_KEY, String(endBreakTime));
      AsyncStorage.setItem(CHECKPOINT_METERS_KEY, String(newCheckpoint));
      AsyncStorage.setItem(LIFETIME_ELEVATION_KEY, String(newLifetime));
      
      set({
        phase: "plateau",
        timeRemaining: breakDuration,
        checkpointMeters: newCheckpoint,
        lifetimeElevation: newLifetime,
        endTimestamp: endBreakTime,
      });
      return;
    }

    if (phase === "plateau" && remaining === 0) {
      const { autoStart } = get();
      AsyncStorage.removeItem(END_TIMESTAMP_KEY);
      
      if (autoStart) {
        const endTime = Date.now() + focusDuration * 1000;
        AsyncStorage.setItem(END_TIMESTAMP_KEY, String(endTime));
        set({
          phase: "climbing",
          timeRemaining: focusDuration,
          sessionMeters: 0,
          endTimestamp: endTime,
        });
      } else {
        set({
          phase: "idle",
          timeRemaining: focusDuration,
          sessionMeters: 0,
          endTimestamp: null,
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

    if (phase === "climbing" && elapsedBackground >= BACKGROUND_GRACE_MS) {
      AsyncStorage.removeItem(END_TIMESTAMP_KEY);
      if (hardcoreMode) {
        AsyncStorage.setItem(CHECKPOINT_METERS_KEY, "0");
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
    const [rawEndTime, rawCheckpoint, rawLifetime, rawSettings] = await Promise.all([
      AsyncStorage.getItem(END_TIMESTAMP_KEY),
      AsyncStorage.getItem(CHECKPOINT_METERS_KEY),
      AsyncStorage.getItem(LIFETIME_ELEVATION_KEY),
      AsyncStorage.getItem(SETTINGS_KEY),
    ]);

    const savedCheckpoint = rawCheckpoint ? Number(rawCheckpoint) : 0;
    const savedLifetime = rawLifetime ? Number(rawLifetime) : 0;
    const savedSettings = rawSettings ? JSON.parse(rawSettings) : {};

    set({
      checkpointMeters: savedCheckpoint,
      lifetimeElevation: savedLifetime,
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
      await AsyncStorage.removeItem(END_TIMESTAMP_KEY);
    }
  },

  toggleAutoStart: () => {
    const { autoStart } = get();
    const newValue = !autoStart;
    set({ autoStart: newValue });
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, autoStart: newValue }));
    });
  },

  toggleKeepScreenOn: () => {
    const { keepScreenOn } = get();
    const newValue = !keepScreenOn;
    set({ keepScreenOn: newValue });
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, keepScreenOn: newValue }));
    });
  },

  requestHardcoreMode: (enable: boolean) => {
    if (enable) {
      set({ showHardcoreConfirmModal: true });
    } else {
      set({ hardcoreMode: false });
      AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
        const settings = raw ? JSON.parse(raw) : {};
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, hardcoreMode: false }));
      });
    }
  },

  confirmHardcoreMode: () => {
    set({ hardcoreMode: true, showHardcoreConfirmModal: false });
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const settings = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, hardcoreMode: true }));
    });
  },

  cancelHardcoreMode: () => {
    set({ showHardcoreConfirmModal: false });
  },
}));

export const TIMER_CONSTANTS = {
  DEFAULT_FOCUS_SEC,
  DEFAULT_BREAK_SEC,
  BACKGROUND_GRACE_MS,
  FALL_DURATION_MS,
  END_TIMESTAMP_KEY,
  CHECKPOINT_METERS_KEY,
  LIFETIME_ELEVATION_KEY,
};
