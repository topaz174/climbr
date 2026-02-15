import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const END_TIMESTAMP_KEY = "@climbr_end_timestamp";
const CHECKPOINT_METERS_KEY = "@climbr_checkpoint_meters";
const LIFETIME_ELEVATION_KEY = "@climbr_lifetime_elevation";
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
}

const FALL_DURATION_MS = 2000;

interface TimerActions {
  startSession: () => Promise<void>;
  openGiveUpConfirm: () => void;
  closeGiveUpConfirm: () => void;
  confirmGiveUp: () => void;
  confirmProgressLost: () => void;
  fallBack: () => void;
  tick: () => void;
  syncFromEndTimestamp: () => void;
  onAppForeground: (backgroundStartTime: number) => void;
  restoreFromStorage: () => Promise<void>;
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

  openGiveUpConfirm: () => {
    const { phase } = get();
    if (phase !== "climbing") return;
    set({ showGiveUpConfirmModal: true });
  },

  closeGiveUpConfirm: () => set({ showGiveUpConfirmModal: false }),

  confirmGiveUp: () => {
    const { timeRemaining, sessionMeters } = get();
    AsyncStorage.removeItem(END_TIMESTAMP_KEY);
    set({
      showGiveUpConfirmModal: false,
      phase: "fall",
      endTimestamp: null,
      fallStartTimeRemaining: timeRemaining,
      metersLostInFall: sessionMeters,
    });
  },

  confirmProgressLost: () => {
    const { timeRemaining } = get();
    set({
      showFallModal: false,
      phase: "fall",
      fallStartTimeRemaining: timeRemaining,
    });
  },

  fallBack: () => {
    const { focusDuration } = get();
    AsyncStorage.removeItem(END_TIMESTAMP_KEY);
    set({
      showFallModal: false,
      phase: "idle",
      timeRemaining: focusDuration,
      sessionMeters: 0,
      endTimestamp: null,
      fallStartTimeRemaining: null,
      metersLostInFall: 0,
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
      AsyncStorage.removeItem(END_TIMESTAMP_KEY);
      set({
        phase: "idle",
        timeRemaining: focusDuration,
        sessionMeters: 0,
        endTimestamp: null,
      });
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

  onAppForeground: (backgroundStartTime: number) => {
    const { phase, sessionMeters } = get();
    const elapsedBackground = Date.now() - backgroundStartTime;

    if (phase === "climbing" && elapsedBackground >= BACKGROUND_GRACE_MS) {
      AsyncStorage.removeItem(END_TIMESTAMP_KEY);
      set({
        showFallModal: true,
        metersLostInFall: sessionMeters,
        endTimestamp: null,
      });
      return;
    }

    get().syncFromEndTimestamp();
  },

  restoreFromStorage: async () => {
    const [rawEndTime, rawCheckpoint, rawLifetime] = await Promise.all([
      AsyncStorage.getItem(END_TIMESTAMP_KEY),
      AsyncStorage.getItem(CHECKPOINT_METERS_KEY),
      AsyncStorage.getItem(LIFETIME_ELEVATION_KEY),
    ]);

    const savedCheckpoint = rawCheckpoint ? Number(rawCheckpoint) : 0;
    const savedLifetime = rawLifetime ? Number(rawLifetime) : 0;

    set({
      checkpointMeters: savedCheckpoint,
      lifetimeElevation: savedLifetime,
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
