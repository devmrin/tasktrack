import type { TransactionRecord } from '@/db/database';

export type HistoryGroupMode = 'date' | 'ticket';

export interface HistoryDateRange {
  readonly from: number | null;
  readonly to: number | null;
}

export type HistoryDateRangePreset =
  | 'all'
  | 'today'
  | 'last7Days'
  | 'last30Days'
  | 'last90Days'
  | 'last365Days'
  | 'last730Days';

export type HistoryDeleteRange = 'all' | 'today' | 'last7Days' | 'last30Days';

export interface HistoryQueryFilters {
  readonly boardId: string | null;
  readonly dateRange: HistoryDateRange;
}

export interface DateGroup {
  readonly label: string;
  readonly dayStart: number;
  readonly transactions: readonly TransactionRecord[];
}

export interface TicketGroup {
  readonly ticketId: string;
  readonly ticketLabel: string;
  readonly ticketTitle?: string;
  readonly transactions: readonly TransactionRecord[];
}

