import {
  db,
  type TransactionEventType,
  type TransactionRecord,
  type TransactionTicketRef,
} from '@/db/database';
import { INBOX_COLUMN_ID } from '@/modules/inbox';
import type {
  HistoryDateRange,
  HistoryDateRangePreset,
  HistoryDeleteRange,
  HistoryQueryFilters,
} from '@/modules/history/types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const ALL_TIME_HISTORY_DATE_RANGE: HistoryDateRange = Object.freeze({
  from: null,
  to: null,
});

interface RecordHistoryInput {
  readonly eventType: TransactionEventType;
  readonly boardId?: string;
  readonly boardTitle?: string;
  readonly ticketId?: string;
  readonly ticketTitle?: string;
  readonly ticketKey?: string;
  readonly fromColumnId?: string;
  readonly toColumnId?: string;
  readonly summary?: string;
  readonly createdAt?: number;
  readonly jiraCreatedCount?: number;
  readonly jiraUpdatedCount?: number;
  readonly jiraRemovedCount?: number;
  readonly jiraCreatedTickets?: TransactionTicketRef[];
  readonly jiraUpdatedTickets?: TransactionTicketRef[];
  readonly jiraRemovedTickets?: TransactionTicketRef[];
}

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function createHistoryDateRangeFromPreset(
  preset: HistoryDateRangePreset,
  nowTimestamp = Date.now(),
): HistoryDateRange {
  const startOfToday = getStartOfDay(nowTimestamp);
  const endOfToday = getEndOfDay(nowTimestamp);

  if (preset === 'all') {
    return ALL_TIME_HISTORY_DATE_RANGE;
  }
  if (preset === 'today') {
    return {
      from: startOfToday,
      to: endOfToday,
    };
  }

  const dayCountByPreset: Record<Exclude<HistoryDateRangePreset, 'all' | 'today'>, number> = {
    last7Days: 7,
    last30Days: 30,
    last90Days: 90,
    last365Days: 365,
    last730Days: 730,
  };

  const dayCount = dayCountByPreset[preset];

  return {
    from: startOfToday - (dayCount - 1) * DAY_IN_MS,
    to: endOfToday,
  };
}

export function normalizeHistoryDateRange(dateRange: HistoryDateRange): HistoryDateRange {
  const normalizedFrom = dateRange.from === null ? null : getStartOfDay(dateRange.from);
  const normalizedTo = dateRange.to === null ? null : getEndOfDay(dateRange.to);

  if (normalizedFrom !== null && normalizedTo !== null && normalizedFrom > normalizedTo) {
    const originalFrom = dateRange.from;
    const originalTo = dateRange.to;
    if (originalFrom === null || originalTo === null) {
      return {
        from: normalizedFrom,
        to: normalizedTo,
      };
    }
    return {
      from: getStartOfDay(originalTo),
      to: getEndOfDay(originalFrom),
    };
  }

  return {
    from: normalizedFrom,
    to: normalizedTo,
  };
}

export function resolveHistoryDeleteRangeStart(
  dateRange: HistoryDeleteRange,
  nowTimestamp = Date.now(),
): number | null {
  const startOfToday = getStartOfDay(nowTimestamp);
  if (dateRange === 'today') {
    return startOfToday;
  }
  if (dateRange === 'last7Days') {
    return startOfToday - 6 * DAY_IN_MS;
  }
  if (dateRange === 'last30Days') {
    return startOfToday - 29 * DAY_IN_MS;
  }
  return null;
}

async function resolveColumnTitle(
  columnId: string | undefined,
): Promise<string | undefined> {
  if (!columnId) {
    return undefined;
  }
  if (columnId === INBOX_COLUMN_ID) {
    return 'Inbox';
  }
  const column = await db.columns.get(columnId);
  return column?.title;
}

async function resolveBoardTitleSnapshot(
  boardId: string | undefined,
): Promise<string | undefined> {
  if (!boardId) {
    return undefined;
  }
  const board = await db.boards.get(boardId);
  return board?.name;
}

export async function recordHistoryTransaction(
  input: RecordHistoryInput,
): Promise<void> {
  const fromColumnTitle = await resolveColumnTitle(input.fromColumnId);
  const toColumnTitle = await resolveColumnTitle(input.toColumnId);
  const boardTitle = input.boardTitle ?? (await resolveBoardTitleSnapshot(input.boardId));
  const record: TransactionRecord = {
    id: crypto.randomUUID(),
    createdAt: input.createdAt ?? Date.now(),
    boardId: input.boardId,
    boardTitle,
    eventType: input.eventType,
    ticketId: input.ticketId,
    ticketTitle: input.ticketTitle,
    ticketKey: input.ticketKey,
    fromColumnId: input.fromColumnId,
    fromColumnTitle,
    toColumnId: input.toColumnId,
    toColumnTitle,
    summary: input.summary,
    jiraCreatedCount: input.jiraCreatedCount,
    jiraUpdatedCount: input.jiraUpdatedCount,
    jiraRemovedCount: input.jiraRemovedCount,
    jiraCreatedTickets: input.jiraCreatedTickets,
    jiraUpdatedTickets: input.jiraUpdatedTickets,
    jiraRemovedTickets: input.jiraRemovedTickets,
  };
  await db.transactions.add(record);
}

export async function getHistoryTransactions(
  filters: HistoryQueryFilters,
): Promise<TransactionRecord[]> {
  const normalizedDateRange = normalizeHistoryDateRange(filters.dateRange);
  const transactions =
    normalizedDateRange.from === null
      ? await db.transactions.toArray()
      : await db.transactions.where('createdAt').aboveOrEqual(normalizedDateRange.from).toArray();

  const filteredTransactions = transactions.filter((transaction) => {
    if (
      normalizedDateRange.to !== null
      && transaction.createdAt > normalizedDateRange.to
    ) {
      return false;
    }
    if (filters.boardId !== null && transaction.boardId !== filters.boardId) {
      return false;
    }
    return true;
  });

  return filteredTransactions.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return b.createdAt - a.createdAt;
    }
    return b.id.localeCompare(a.id);
  });
}

export async function deleteHistoryTransactions(
  dateRange: HistoryDeleteRange,
): Promise<void> {
  const rangeStart = resolveHistoryDeleteRangeStart(dateRange);
  if (dateRange === 'all') {
    await db.transactions.clear();
    return;
  }
  if (rangeStart === null) {
    return;
  }
  await db.transactions.where('createdAt').aboveOrEqual(rangeStart).delete();
}

