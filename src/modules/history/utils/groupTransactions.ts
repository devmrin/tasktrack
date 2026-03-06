import type { TransactionRecord, TransactionTicketRef } from '@/db/database';
import type { DateGroup, TicketGroup } from '@/modules/history/types';

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getDateLabel(dayStart: number): string {
  const todayStart = getStartOfDay(Date.now());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  if (dayStart === todayStart) {
    return 'Today';
  }
  if (dayStart === yesterdayStart) {
    return 'Yesterday';
  }
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortByNewest(a: TransactionRecord, b: TransactionRecord): number {
  if (a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }
  return b.id.localeCompare(a.id);
}

function sortByOldest(a: TransactionRecord, b: TransactionRecord): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
}

export function groupTransactionsByDate(
  transactions: readonly TransactionRecord[],
): DateGroup[] {
  const grouped = new Map<number, TransactionRecord[]>();
  for (const transaction of transactions) {
    const dayStart = getStartOfDay(transaction.createdAt);
    const dayTransactions = grouped.get(dayStart) ?? [];
    dayTransactions.push(transaction);
    grouped.set(dayStart, dayTransactions);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => b - a)
    .map(([dayStart, dayTransactions]) => ({
      dayStart,
      label: getDateLabel(dayStart),
      transactions: [...dayTransactions].sort(sortByNewest),
    }));
}

function getTicketLabel(transaction: TransactionRecord): string {
  if (transaction.ticketKey) {
    return transaction.ticketKey;
  }
  if (transaction.ticketTitle) {
    return transaction.ticketTitle;
  }
  return 'Unknown ticket';
}

export function groupTransactionsByTicket(
  transactions: readonly TransactionRecord[],
): TicketGroup[] {
  const grouped = new Map<string, TransactionRecord[]>();

  for (const transaction of transactions) {
    if (!transaction.ticketId) {
      continue;
    }
    const ticketTransactions = grouped.get(transaction.ticketId) ?? [];
    ticketTransactions.push(transaction);
    grouped.set(transaction.ticketId, ticketTransactions);
  }

  const groups: TicketGroup[] = [];
  for (const [ticketId, ticketTransactions] of grouped.entries()) {
    const latest = [...ticketTransactions].sort(sortByNewest)[0];
    groups.push({
      ticketId,
      ticketLabel: getTicketLabel(latest),
      ticketTitle: latest.ticketTitle,
      transactions: [...ticketTransactions].sort(sortByOldest),
    });
  }

  return groups.sort((a, b) => {
    const aLatest = a.transactions[a.transactions.length - 1]?.createdAt ?? 0;
    const bLatest = b.transactions[b.transactions.length - 1]?.createdAt ?? 0;
    if (aLatest !== bLatest) {
      return bLatest - aLatest;
    }
    return a.ticketLabel.localeCompare(b.ticketLabel);
  });
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTransactionMessage(transaction: TransactionRecord): string {
  if (transaction.summary) {
    return transaction.summary;
  }
  switch (transaction.eventType) {
    case 'ticket_created_local':
      return 'Created local ticket';
    case 'ticket_moved': {
      const fromLabel = transaction.fromColumnTitle ?? 'Unknown';
      const toLabel = transaction.toColumnTitle ?? 'Unknown';
      return `Moved from ${fromLabel} to ${toLabel}`;
    }
    case 'ticket_deleted':
      return 'Deleted ticket';
    case 'jira_sync_summary':
      return 'JIRA sync completed';
    case 'column_deleted_bulk_move':
      return 'Deleted column and moved tickets';
    default:
      return 'Updated ticket';
  }
}

export function formatTransactionTime(timestamp: number): string {
  return formatTimestamp(timestamp);
}

export interface JiraSyncTicketDetails {
  readonly created: readonly TransactionTicketRef[];
  readonly updated: readonly TransactionTicketRef[];
  readonly removed: readonly TransactionTicketRef[];
}

export function getJiraSyncTicketDetails(
  transaction: TransactionRecord,
): JiraSyncTicketDetails | null {
  if (transaction.eventType !== 'jira_sync_summary') {
    return null;
  }

  if (
    Array.isArray(transaction.jiraCreatedTickets) &&
    Array.isArray(transaction.jiraUpdatedTickets) &&
    Array.isArray(transaction.jiraRemovedTickets)
  ) {
    return {
      created: transaction.jiraCreatedTickets,
      updated: transaction.jiraUpdatedTickets,
      removed: transaction.jiraRemovedTickets,
    };
  }

  return null;
}

