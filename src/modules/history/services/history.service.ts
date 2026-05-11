import {
  db,
  type TransactionEventType,
  type TransactionRecord,
  type TransactionTicketRef,
} from '@/db/database';
import { INBOX_COLUMN_ID } from '@/modules/inbox';
import type { HistoryDateRange } from '@/modules/history/types';

interface RecordHistoryInput {
  readonly eventType: TransactionEventType;
  readonly boardId?: string;
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

export function resolveHistoryRangeStart(
  dateRange: HistoryDateRange,
  nowTimestamp = Date.now(),
): number | null {
  const startOfToday = getStartOfDay(nowTimestamp);
  if (dateRange === 'today') {
    return startOfToday;
  }
  if (dateRange === 'last7Days') {
    return startOfToday - 6 * 24 * 60 * 60 * 1000;
  }
  if (dateRange === 'last30Days') {
    return startOfToday - 29 * 24 * 60 * 60 * 1000;
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
  const boardTitle = await resolveBoardTitleSnapshot(input.boardId);
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
  dateRange: HistoryDateRange,
): Promise<TransactionRecord[]> {
  const rangeStart = resolveHistoryRangeStart(dateRange);
  const transactions =
    rangeStart === null
      ? await db.transactions.toArray()
      : await db.transactions.where('createdAt').aboveOrEqual(rangeStart).toArray();
  return transactions.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return b.createdAt - a.createdAt;
    }
    return b.id.localeCompare(a.id);
  });
}

export async function deleteHistoryTransactions(
  dateRange: HistoryDateRange,
): Promise<void> {
  const rangeStart = resolveHistoryRangeStart(dateRange);
  if (dateRange === 'all') {
    await db.transactions.clear();
    return;
  }
  if (rangeStart === null) {
    return;
  }
  await db.transactions.where('createdAt').aboveOrEqual(rangeStart).delete();
}

