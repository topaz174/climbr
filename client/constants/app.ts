/**
 * App-wide constants: timer defaults, thresholds, and persistence keys.
 */

export const TIMER = {
  /** Default focus session length (minutes). */
  DEFAULT_FOCUS_MINUTES: 30,
  /** Default focus session length (seconds). */
  DEFAULT_FOCUS_SEC: 30 * 60,
  /** Default break session length (seconds). */
  DEFAULT_BREAK_SEC: 5 * 60,
  /** Ms in background before session is lost (slacking off). */
  BACKGROUND_GRACE_MS: 10_000,
  /** Seconds after climb start before immersion; "Xs to cancel" and give-up threshold. */
  IMMERSIVE_GRACE_SEC: 10,
  /** Fall animation duration (ms). */
  FALL_DURATION_MS: 2000,
} as const;

export const STORAGE_KEYS = {
  END_TIMESTAMP: "@climbr_end_timestamp",
  CHECKPOINT_METERS: "@climbr_checkpoint_meters",
  LIFETIME_ELEVATION: "@climbr_lifetime_elevation",
  COINS: "@climbr_coins",
  SETTINGS: "@climbr_settings",
} as const;

/** Convenience re-exports for call sites that expect a single constant. */
export const IMMERSIVE_GRACE_SEC = TIMER.IMMERSIVE_GRACE_SEC;
export const DEFAULT_FOCUS_SEC = TIMER.DEFAULT_FOCUS_SEC;
