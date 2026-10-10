import type { Column, Ticket, TransactionRecord } from '@/db/database';
import { TICKET_PRIORITY_VALUES, type TicketPriority } from '@/utils/ticketPriority';

const DAY_MS = 24 * 60 * 60 * 1000;
const DONE_COLUMN_PATTERN = /^(done|complete)/i;
const IN_PROGRESS_COLUMN_PATTERN = /in\s*progress/i;

export interface SummaryKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly hint: string;
}

export interface NamedCount {
  readonly name: string;
  readonly count: number;
}

export interface BoardSummaryMetrics {
  readonly kpis: SummaryKpi[];
  readonly statusOverview: NamedCount[];
  readonly priorityBreakdown: NamedCount[];
  readonly workTypes: NamedCount[];
  readonly totalItems: number;
}

export interface ComputeBoardSummaryInput {
  readonly tickets: readonly Ticket[];
  readonly columns: readonly Column[];
  readonly transactions: readonly TransactionRecord[];
  readonly now?: number;
  readonly focusEnabled?: boolean;
  readonly focusedTicket?: Ticket | null;
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function parseDueDateMs(dueDate: string): number | null {
  const match = dueDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return null;
  }
  return date.getTime();
}

export function isDoneColumnTitle(title: string): boolean {
  return DONE_COLUMN_PATTERN.test(title.trim());
}

export function findInProgressColumn(
  columns: readonly Column[],
): Column | undefined {
  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const byTitle = sorted.find((c) => IN_PROGRESS_COLUMN_PATTERN.test(c.title));
  if (byTitle) {
    return byTitle;
  }
  return sorted.length >= 2 ? sorted[1] : undefined;
}

function boardTickets(tickets: readonly Ticket[], columns: readonly Column[]): Ticket[] {
  const columnIds = new Set(columns.map((c) => c.id));
  return tickets.filter((t) => columnIds.has(t.columnId));
}

function ticketDisplayLabel(ticket: Ticket): string {
  const key =
    ticket.type === 'jira' && ticket.jiraData?.jiraKey
      ? ticket.jiraData.jiraKey
      : ticket.customKey;
  return key ? `${key} · ${ticket.title}` : ticket.title;
}

export function computeBoardSummaryMetrics(
  input: ComputeBoardSummaryInput,
): BoardSummaryMetrics {
  const now = input.now ?? Date.now();
  const windowStart = now - 7 * DAY_MS;
  const todayStart = startOfDay(now);
  const dueSoonEnd = todayStart + 7 * DAY_MS + DAY_MS - 1;

  const columns = input.columns;
  const columnById = new Map(columns.map((c) => [c.id, c]));
  const doneColumnIds = new Set(
    columns.filter((c) => isDoneColumnTitle(c.title)).map((c) => c.id),
  );
  const onBoard = boardTickets(input.tickets, columns);

  const completedFromTickets = onBoard.filter(
    (t) => doneColumnIds.has(t.columnId) && t.updatedAt >= windowStart,
  ).length;

  const completedFromMoves = new Set(
    input.transactions
      .filter(
        (tx) =>
          tx.eventType === 'ticket_moved'
          && tx.createdAt >= windowStart
          && typeof tx.toColumnId === 'string'
          && doneColumnIds.has(tx.toColumnId),
      )
      .map((tx) => tx.ticketId)
      .filter((id): id is string => typeof id === 'string'),
  );

  const completedTicketIds = new Set([
    ...onBoard
      .filter((t) => doneColumnIds.has(t.columnId) && t.updatedAt >= windowStart)
      .map((t) => t.id),
    ...completedFromMoves,
  ]);

  const completedCount = Math.max(
    completedTicketIds.size,
    completedFromTickets,
  );

  const updatedCount = onBoard.filter((t) => t.updatedAt >= windowStart).length;
  const createdCount = onBoard.filter((t) => t.createdAt >= windowStart).length;
  const dueSoonCount = onBoard.filter((t) => {
    if (!t.dueDate) {
      return false;
    }
    const dueMs = parseDueDateMs(t.dueDate);
    if (dueMs === null) {
      return false;
    }
    return dueMs >= todayStart && dueMs <= dueSoonEnd;
  }).length;

  const kpis: SummaryKpi[] = [
    {
      id: 'completed',
      label: 'Completed',
      value: completedCount,
      hint: 'in the last 7 days',
    },
    {
      id: 'updated',
      label: 'Updated',
      value: updatedCount,
      hint: 'in the last 7 days',
    },
    {
      id: 'created',
      label: 'Created',
      value: createdCount,
      hint: 'in the last 7 days',
    },
    {
      id: 'dueSoon',
      label: 'Due soon',
      value: dueSoonCount,
      hint: 'in the next 7 days',
    },
  ];

  if (input.focusEnabled) {
    const boardId = columns[0]?.boardId ?? onBoard[0]?.boardId ?? input.tickets[0]?.boardId;
    const focused = input.focusedTicket ?? null;
    const resolvedFocus =
      focused && boardId && focused.boardId === boardId ? focused : null;

    kpis.push({
      id: 'focusNow',
      label: 'Focus now',
      value: resolvedFocus ? ticketDisplayLabel(resolvedFocus) : 'No active session',
      hint: resolvedFocus ? 'current focus session' : 'start focus from the board',
    });

    const inProgressColumn = findInProgressColumn(columns);
    const readyCount = inProgressColumn
      ? onBoard.filter((t) => t.columnId === inProgressColumn.id).length
      : 0;

    kpis.push({
      id: 'readyToFocus',
      label: 'Ready to focus',
      value: readyCount,
      hint: inProgressColumn
        ? `in “${inProgressColumn.title}”`
        : 'no in-progress column',
    });
  }

  const statusCounts = new Map<string, number>();
  for (const ticket of onBoard) {
    const label =
      ticket.type === 'jira' && ticket.jiraData?.status?.trim()
        ? ticket.jiraData.status.trim()
        : (columnById.get(ticket.columnId)?.title ?? 'Other');
    statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
  }
  const statusOverview = [...statusCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const priorityCounts = new Map<string, number>();
  for (const priority of TICKET_PRIORITY_VALUES) {
    priorityCounts.set(priority, 0);
  }
  priorityCounts.set('None', 0);
  for (const ticket of onBoard) {
    const key: TicketPriority | 'None' = ticket.priority ?? 'None';
    priorityCounts.set(key, (priorityCounts.get(key) ?? 0) + 1);
  }
  const priorityBreakdown = [
    ...TICKET_PRIORITY_VALUES.map((name) => ({
      name,
      count: priorityCounts.get(name) ?? 0,
    })),
    { name: 'None', count: priorityCounts.get('None') ?? 0 },
  ];

  const jiraCount = onBoard.filter((t) => t.type === 'jira').length;
  const localCount = onBoard.filter((t) => t.type === 'local').length;
  const workTypes: NamedCount[] = [
    { name: 'Jira', count: jiraCount },
    { name: 'Local', count: localCount },
  ];

  return {
    kpis,
    statusOverview,
    priorityBreakdown,
    workTypes,
    totalItems: onBoard.length,
  };
}
