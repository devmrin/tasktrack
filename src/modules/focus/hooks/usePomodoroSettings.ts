import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { db } from '@/db/database';
import type { PomodoroSettings } from '@/modules/focus/types';
import { DEFAULT_POMODORO_SETTINGS, SETTING_KEYS } from '@/modules/focus/constants';

type Listener = () => void;

const listeners = new Set<Listener>();
let sharedSettings: PomodoroSettings = DEFAULT_POMODORO_SETTINGS;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PomodoroSettings {
  return sharedSettings;
}

async function loadFromDb(): Promise<void> {
  const [work, short, long, interval, autoBreaks, autoPomodoros, chime] = await Promise.all([
    db.settings.get(SETTING_KEYS.pomodoroWorkDuration),
    db.settings.get(SETTING_KEYS.pomodoroShortBreak),
    db.settings.get(SETTING_KEYS.pomodoroLongBreak),
    db.settings.get(SETTING_KEYS.pomodoroLongBreakInterval),
    db.settings.get(SETTING_KEYS.pomodoroAutoStartBreaks),
    db.settings.get(SETTING_KEYS.pomodoroAutoStartPomodoros),
    db.settings.get(SETTING_KEYS.pomodoroChimeOnTimerComplete),
  ]);

  sharedSettings = {
    workDuration: work ? Number(work.value) : DEFAULT_POMODORO_SETTINGS.workDuration,
    shortBreakDuration: short ? Number(short.value) : DEFAULT_POMODORO_SETTINGS.shortBreakDuration,
    longBreakDuration: long ? Number(long.value) : DEFAULT_POMODORO_SETTINGS.longBreakDuration,
    longBreakInterval: interval
      ? Number(interval.value)
      : DEFAULT_POMODORO_SETTINGS.longBreakInterval,
    autoStartBreaks: autoBreaks ? autoBreaks.value === 'true' : DEFAULT_POMODORO_SETTINGS.autoStartBreaks,
    autoStartPomodoros: autoPomodoros
      ? autoPomodoros.value === 'true'
      : DEFAULT_POMODORO_SETTINGS.autoStartPomodoros,
    chimeOnTimerComplete: chime
      ? chime.value === 'true'
      : DEFAULT_POMODORO_SETTINGS.chimeOnTimerComplete,
  };
  isLoaded = true;
  notify();
}

async function persistAndUpdate(next: PomodoroSettings): Promise<void> {
  await db.settings.bulkPut([
    { key: SETTING_KEYS.pomodoroWorkDuration, value: String(next.workDuration) },
    { key: SETTING_KEYS.pomodoroShortBreak, value: String(next.shortBreakDuration) },
    { key: SETTING_KEYS.pomodoroLongBreak, value: String(next.longBreakDuration) },
    { key: SETTING_KEYS.pomodoroLongBreakInterval, value: String(next.longBreakInterval) },
    { key: SETTING_KEYS.pomodoroAutoStartBreaks, value: String(next.autoStartBreaks) },
    { key: SETTING_KEYS.pomodoroAutoStartPomodoros, value: String(next.autoStartPomodoros) },
    { key: SETTING_KEYS.pomodoroChimeOnTimerComplete, value: String(next.chimeOnTimerComplete) },
  ]);
  sharedSettings = next;
  notify();
}

export function usePomodoroSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!isLoaded && !loadPromise) {
      loadPromise = loadFromDb();
    }
  }, []);

  const updateSettings = useCallback(async (next: PomodoroSettings) => {
    await persistAndUpdate(next);
  }, []);

  return { settings, updateSettings, loaded: isLoaded };
}
