import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";
import {
  ALERT_SOUND_FOCUS_COMPLETE,
  ALERT_SOUND_BREAK_COMPLETE,
} from "@/constants/alertSounds";

const TIMER_END_NOTIFICATION_ID = "climbr_timer_end";
const VIBRATION_DURATION_MS = 700;
const VIBRATION_FOCUS_COMPLETE: number[] = [0, VIBRATION_DURATION_MS];
const VIBRATION_BREAK_COMPLETE: number[] = [0, VIBRATION_DURATION_MS];

let focusCompleteSound: Audio.Sound | null = null;
let breakCompleteSound: Audio.Sound | null = null;
let scheduledNotificationId: string | null = null;

async function setAudioMode() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

async function loadSound(
  source: number | { uri: string } | null
): Promise<Audio.Sound | null> {
  if (source == null) return null;
  try {
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
    return sound;
  } catch {
    return null;
  }
}

export async function initAlertService(): Promise<void> {
  await setAudioMode();
  focusCompleteSound = await loadSound(ALERT_SOUND_FOCUS_COMPLETE);
  breakCompleteSound = await loadSound(ALERT_SOUND_BREAK_COMPLETE);
}

async function playSound(sound: Audio.Sound | null) {
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // ignore
  }
}

function vibratePattern(pattern: number[]) {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    Vibration.vibrate(pattern);
  }
}

export function focusComplete(): void {
  vibratePattern(VIBRATION_FOCUS_COMPLETE);
  playSound(focusCompleteSound);
}

export function breakComplete(): void {
  vibratePattern(VIBRATION_BREAK_COMPLETE);
  playSound(breakCompleteSound);
}

export function sessionLost(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function scheduleTimerEndNotification(
  triggerAtMs: number,
  isBreak: boolean
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await cancelScheduledTimerNotification();

  const title = isBreak ? "Break complete" : "Focus complete";
  const body = isBreak ? "Ready to climb." : "Time for a break.";
  const secondsFromNow = Math.max(0, (triggerAtMs - Date.now()) / 1000);
  if (secondsFromNow <= 0) return;

  const id = await Notifications.scheduleNotificationAsync({
    identifier: TIMER_END_NOTIFICATION_ID,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
      repeats: false,
    },
  });
  scheduledNotificationId = id;
}

export async function cancelScheduledTimerNotification(): Promise<void> {
  if (scheduledNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
    scheduledNotificationId = null;
  } else {
    try {
      await Notifications.cancelScheduledNotificationAsync(TIMER_END_NOTIFICATION_ID);
    } catch {
      // ignore
    }
  }
}
