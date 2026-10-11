import type { PomodoroSettings } from '@/modules/focus/types';

export const SETTING_KEYS = {
  focusEnabled: 'focus-enabled',
  focusTicketId: 'focus-ticket-id',
  focusOriginalColumnId: 'focus-original-column-id',
  focusCustomLabel: 'focus-custom-label',
  pomodoroWorkDuration: 'pomodoro-work-duration',
  pomodoroShortBreak: 'pomodoro-short-break',
  pomodoroLongBreak: 'pomodoro-long-break',
  pomodoroLongBreakInterval: 'pomodoro-long-break-interval',
  pomodoroAutoStartBreaks: 'pomodoro-auto-start-breaks',
  pomodoroAutoStartPomodoros: 'pomodoro-auto-start-pomodoros',
  pomodoroChimeOnTimerComplete: 'pomodoro-chime-on-timer-complete',
} as const;

/** Max length for a one-off focus task typed on /focus. */
export const FOCUS_CUSTOM_LABEL_MAX_LENGTH = 200;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  enabled: true,
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  chimeOnTimerComplete: true,
};
