import Dexie, { type Table } from 'dexie';
import {
  normalizeTicketPriority,
  type TicketPriority,
} from '@/utils/ticketPriority';

export interface Board {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  jiraEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  priority?: TicketPriority;
  dueDate?: string;
  type: 'jira' | 'local';
  boardId: string;
  columnId: string;
  order: number;
  jiraData?: {
    jiraId: string;
    jiraUrl: string;
    jiraKey: string;
    status?: string;
    assignee?: string;
    priority?: string;
    comments?: JiraComment[];
  };
  customKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface JiraComment {
  id: string;
  parentId?: string;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  body?: unknown;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

export type TransactionEventType =
  | 'board_created'
  | 'board_updated'
  | 'board_deleted'
  | 'ticket_created_local'
  | 'ticket_moved'
  | 'ticket_deleted'
  | 'jira_sync_summary'
  | 'column_deleted_bulk_move';

export interface TransactionRecord {
  id: string;
  createdAt: number;
  boardId?: string;
  /** Snapshot of board name when the transaction was recorded. */
  boardTitle?: string;
  eventType: TransactionEventType;
  ticketId?: string;
  ticketTitle?: string;
  ticketKey?: string;
  fromColumnId?: string;
  fromColumnTitle?: string;
  toColumnId?: string;
  toColumnTitle?: string;
  summary?: string;
  jiraCreatedCount?: number;
  jiraUpdatedCount?: number;
  jiraRemovedCount?: number;
  jiraCreatedTickets?: TransactionTicketRef[];
  jiraUpdatedTickets?: TransactionTicketRef[];
  jiraRemovedTickets?: TransactionTicketRef[];
}

export interface TransactionTicketRef {
  ticketId: string;
  ticketType: Ticket['type'];
  ticketTitle: string;
  ticketKey?: string;
}

export class TaskTrackDatabase extends Dexie {
  tickets!: Table<Ticket>;
  columns!: Table<Column>;
  boards!: Table<Board>;
  settings!: Table<Setting>;
  transactions!: Table<TransactionRecord>;

  constructor() {
    super('TaskTrackDB');

    const defaultBoardId = 'default';

    this.version(1).stores({
      tickets: 'id, columnId, type, createdAt',
      columns: 'id, order',
      settings: 'key',
    });
    this.version(2)
      .stores({
        tickets: 'id, columnId, type, createdAt, order, [columnId+order]',
        columns: 'id, order',
        settings: 'key',
      })
      .upgrade(async (transaction) => {
        type LegacyTicket = Omit<Ticket, 'order'> & { order?: number };
        const ticketsTable = transaction.table<LegacyTicket, string>('tickets');
        const tickets = await ticketsTable.toArray();

        const groupedByColumn = new Map<string, LegacyTicket[]>();
        for (const ticket of tickets) {
          const columnTickets = groupedByColumn.get(ticket.columnId) ?? [];
          columnTickets.push(ticket);
          groupedByColumn.set(ticket.columnId, columnTickets);
        }

        const migratedTickets: Ticket[] = [];
        for (const columnTickets of groupedByColumn.values()) {
          const sortedTickets = [...columnTickets].sort((a, b) => {
            if (a.createdAt !== b.createdAt) {
              return a.createdAt - b.createdAt;
            }
            return a.id.localeCompare(b.id);
          });

          for (const [index, ticket] of sortedTickets.entries()) {
            migratedTickets.push({
              ...ticket,
              order: index,
            });
          }
        }

        if (migratedTickets.length > 0) {
          await ticketsTable.bulkPut(migratedTickets);
        }
      });
    this.version(3).stores({
      tickets: 'id, columnId, type, createdAt, order, [columnId+order]',
      columns: 'id, order',
      settings: 'key',
    });
    this.version(4).upgrade(async (transaction) => {
      const ticketsTable = transaction.table<Ticket, string>('tickets');
      await ticketsTable.where('type').equals('custom').modify({ type: 'local' });
    });
    this.version(5)
      .stores({
        tickets: 'id, columnId, type, createdAt, order, [columnId+order]',
        columns: 'id, order',
        settings: 'key',
      })
      .upgrade(async (transaction) => {
        type TicketWithOptionalPriority = Omit<Ticket, 'priority'> & {
          priority?: TicketPriority;
        };

        const ticketsTable = transaction.table<TicketWithOptionalPriority, string>('tickets');
        const tickets = await ticketsTable.toArray();
        if (tickets.length === 0) {
          return;
        }

        const migratedTickets: Ticket[] = tickets.map((ticket) => ({
          ...ticket,
          priority: ticket.priority
            ? normalizeTicketPriority(ticket.priority)
            : normalizeTicketPriority(ticket.jiraData?.priority),
        }));

        await ticketsTable.bulkPut(migratedTickets);
      });
    this.version(6).stores({
      tickets: 'id, columnId, type, createdAt, order, [columnId+order]',
      columns: 'id, order',
      settings: 'key',
      transactions:
        'id, createdAt, ticketId, eventType, [ticketId+createdAt], [createdAt+eventType]',
    });
    this.version(7)
      .stores({
        tickets: 'id, columnId, type, createdAt, order, [columnId+order]',
        columns: 'id, order',
        settings: 'key',
        transactions:
          'id, createdAt, ticketId, eventType, [ticketId+createdAt], [createdAt+eventType]',
      })
      .upgrade(async (transaction) => {
        type TicketWithOptionalDueDate = Omit<Ticket, 'dueDate'> & {
          dueDate?: string | null;
        };

        const ticketsTable = transaction.table<TicketWithOptionalDueDate, string>('tickets');
        const tickets = await ticketsTable.toArray();
        const migratedTickets: Ticket[] = [];

        for (const ticket of tickets) {
          const normalizedDueDate = typeof ticket.dueDate === 'string'
            ? ticket.dueDate.trim() || undefined
            : undefined;
          if (normalizedDueDate === ticket.dueDate) {
            continue;
          }
          migratedTickets.push({
            ...ticket,
            dueDate: normalizedDueDate,
          });
        }

        if (migratedTickets.length > 0) {
          await ticketsTable.bulkPut(migratedTickets);
        }
      });

    this.version(8)
      .stores({
        boards: 'id, order, isDefault',
        tickets:
          'id, columnId, boardId, type, createdAt, order, [columnId+order], [boardId+columnId+order]',
        columns: 'id, boardId, order, [boardId+order]',
        settings: 'key',
        transactions:
          'id, createdAt, ticketId, eventType, boardId, [ticketId+createdAt], [createdAt+eventType]',
      })
      .upgrade(async (transaction) => {
        const settingsTable = transaction.table<{ key: string; value: string }, string>('settings');
        const tokenRow = await settingsTable.get('atlassian_access_token');
        const hasToken =
          typeof tokenRow?.value === 'string' && tokenRow.value.trim().length > 0;

        const now = Date.now();
        await transaction.table('boards').add({
          id: defaultBoardId,
          name: 'Board',
          order: 0,
          isDefault: true,
          jiraEnabled: hasToken,
          createdAt: now,
          updatedAt: now,
        });

        await transaction.table('columns').toCollection().modify({ boardId: defaultBoardId });
        await transaction.table('tickets').toCollection().modify({ boardId: defaultBoardId });
        await transaction.table('transactions').toCollection().modify({ boardId: defaultBoardId });
      });

    this.version(9)
      .stores({
        boards: 'id, order, isDefault',
        tickets:
          'id, columnId, boardId, type, createdAt, order, [columnId+order], [boardId+columnId+order]',
        columns: 'id, boardId, order, [boardId+order]',
        settings: 'key',
        transactions:
          'id, createdAt, ticketId, eventType, boardId, [ticketId+createdAt], [createdAt+eventType]',
      })
      .upgrade(async (transaction) => {
        const txTable = transaction.table<TransactionRecord, string>('transactions');
        const boardsTable = transaction.table<Board, string>('boards');
        const txs = await txTable.toArray();
        const boards = await boardsTable.toArray();
        const boardNameById = new Map(boards.map((b) => [b.id, b.name]));
        const updated: TransactionRecord[] = [];

        for (const t of txs) {
          if (t.boardTitle || !t.boardId) {
            continue;
          }
          const snapshot = boardNameById.get(t.boardId);
          if (snapshot !== undefined) {
            updated.push({ ...t, boardTitle: snapshot });
          }
        }

        if (updated.length > 0) {
          await txTable.bulkPut(updated);
        }
      });
  }
}

export const db = new TaskTrackDatabase();
