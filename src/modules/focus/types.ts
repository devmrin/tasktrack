import type { Ticket } from '@/db/database';

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  enabled: boolean;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  chimeOnTimerComplete: boolean;
}

export interface FocusState {
  ticketId: string | null;
  originalColumnId: string | null;
}

export interface FocusedTicketData {
  kind: 'ticket';
  ticket: Ticket;
  originalColumnId: string;
}

export interface FocusedCustomData {
  kind: 'custom';
  label: string;
}

export type FocusedData = FocusedTicketData | FocusedCustomData;
