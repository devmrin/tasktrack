import type { TransactionRecord } from '@/db/database';

export type HistoryGroupMode = 'date' | 'ticket';

export type HistoryDateRange = 'all' | 'today' | 'last7Days' | 'last30Days';

export interface HistoryQueryFilters {
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

