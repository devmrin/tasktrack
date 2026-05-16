import type { PomodoroSettings } from '@/modules/focus/types';

export const SETTING_KEYS = {
  focusTicketId: 'focus-ticket-id',
  focusOriginalColumnId: 'focus-original-column-id',
  pomodoroWorkDuration: 'pomodoro-work-duration',
  pomodoroShortBreak: 'pomodoro-short-break',
  pomodoroLongBreak: 'pomodoro-long-break',
  pomodoroLongBreakInterval: 'pomodoro-long-break-interval',
  pomodoroAutoStartBreaks: 'pomodoro-auto-start-breaks',
  pomodoroAutoStartPomodoros: 'pomodoro-auto-start-pomodoros',
  pomodoroChimeOnTimerComplete: 'pomodoro-chime-on-timer-complete',
} as const;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  chimeOnTimerComplete: true,
};

export const FOCUS_ZONE_EXPANDED_HEIGHT = 280;
export const FOCUS_ZONE_COLLAPSED_HEIGHT = 48;
