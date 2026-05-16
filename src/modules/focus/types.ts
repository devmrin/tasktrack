import type { Ticket } from '@/db/database';

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
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
  ticket: Ticket;
  originalColumnId: string;
}
