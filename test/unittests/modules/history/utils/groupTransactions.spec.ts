import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionRecord } from '@/db/database';
import { DEFAULT_BOARD_ID } from '@/modules/boards/constants/board.constants';
import {
  formatTransactionMessage,
  groupTransactionsByDate,
  groupTransactionsByTicket,
} from '@/modules/history/utils/groupTransactions';

const BASE_TIME = new Date('2026-03-06T12:00:00.000Z').getTime();

function createTransaction(
  overrides: Partial<TransactionRecord>,
): TransactionRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: BASE_TIME,
    eventType: 'ticket_moved',
    ...overrides,
  };
}

test('groups transactions by date in descending order', () => {
  const today = createTransaction({
    createdAt: BASE_TIME,
    summary: 'Moved ticket today',
  });
  const yesterday = createTransaction({
    createdAt: BASE_TIME - 24 * 60 * 60 * 1000,
    summary: 'Moved ticket yesterday',
  });

  const groups = groupTransactionsByDate([yesterday, today]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.transactions[0]?.summary, 'Moved ticket today');
  assert.equal(groups[1]?.transactions[0]?.summary, 'Moved ticket yesterday');
});

test('groups transactions by ticket and sorts journey oldest-first', () => {
  const created = createTransaction({
    ticketId: 'ticket-1',
    ticketTitle: 'Ship report',
    ticketKey: 'TASK-123',
    eventType: 'ticket_created_local',
    createdAt: BASE_TIME - 1000,
  });
  const moved = createTransaction({
    ticketId: 'ticket-1',
    ticketTitle: 'Ship report',
    ticketKey: 'TASK-123',
    eventType: 'ticket_moved',
    createdAt: BASE_TIME,
  });

  const groups = groupTransactionsByTicket([moved, created]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.ticketLabel, 'TASK-123');
  assert.equal(groups[0]?.transactions[0]?.eventType, 'ticket_created_local');
  assert.equal(groups[0]?.transactions[1]?.eventType, 'ticket_moved');
});

test('prefers summary message when available', () => {
  const transaction = createTransaction({
    summary: 'JIRA sync: 3 created, 4 updated, 1 removed',
    eventType: 'jira_sync_summary',
  });
  assert.equal(
    formatTransactionMessage(transaction),
    'JIRA sync: 3 created, 4 updated, 1 removed',
  );
});

test('appends board name to summaries when snapshot is stored', () => {
  const transaction = createTransaction({
    summary: 'JIRA sync: 3 created, 4 updated, 1 removed',
    eventType: 'jira_sync_summary',
    boardTitle: 'Sprint planning',
    boardId: 'board-a',
  });
  assert.equal(
    formatTransactionMessage(transaction),
    'JIRA sync: 3 created, 4 updated, 1 removed in Sprint planning',
  );
});

test('uses home-style suffix when board label is the legacy default slug', () => {
  assert.equal(
    formatTransactionMessage(
      createTransaction({
        summary: 'JIRA sync: 3 created, 4 updated, 1 removed',
        eventType: 'jira_sync_summary',
        boardId: DEFAULT_BOARD_ID,
      }),
    ),
    'JIRA sync: 3 created, 4 updated, 1 removed in Home',
  );
});

test('shows board snapshot when legacy default board was renamed', () => {
  assert.equal(
    formatTransactionMessage(
      createTransaction({
        summary: 'JIRA sync: 3 created',
        eventType: 'jira_sync_summary',
        boardId: DEFAULT_BOARD_ID,
        boardTitle: 'Board',
      }),
    ),
    'JIRA sync: 3 created in Board',
  );
});

test('falls back to board id in message when snapshot is absent', () => {
  const transaction = createTransaction({
    summary: 'Created local ticket',
    eventType: 'ticket_created_local',
    boardId: 'legacy-board',
  });
  assert.equal(
    formatTransactionMessage(transaction),
    'Created local ticket in legacy-board',
  );
});

test('describes moved ticket source and destination columns', () => {
  const transaction = createTransaction({
    fromColumnTitle: 'Todo',
    toColumnTitle: 'In Progress',
  });

  assert.equal(
    formatTransactionMessage(transaction),
    'Moved from Todo to In Progress',
  );
});

test('appends board to move description when recorded', () => {
  const transaction = createTransaction({
    fromColumnTitle: 'Todo',
    toColumnTitle: 'In Progress',
    boardTitle: 'Engineering',
    boardId: 'b1',
  });

  assert.equal(
    formatTransactionMessage(transaction),
    'Moved from Todo to In Progress in Engineering',
  );
});

test('formats board lifecycle events using stored board snapshots', () => {
  assert.equal(
    formatTransactionMessage(
      createTransaction({
        eventType: 'board_created',
        summary: undefined,
        boardId: 'board-1',
        boardTitle: 'Roadmap',
      }),
    ),
    'Created board in Roadmap',
  );

  assert.equal(
    formatTransactionMessage(
      createTransaction({
        eventType: 'board_updated',
        summary: 'Renamed board from "Ops" to "Platform"',
        boardId: 'board-2',
        boardTitle: 'Platform',
      }),
    ),
    'Renamed board from "Ops" to "Platform" in Platform',
  );

  assert.equal(
    formatTransactionMessage(
      createTransaction({
        eventType: 'board_deleted',
        summary: 'Deleted board "Backlog"',
        boardId: 'board-3',
        boardTitle: 'Backlog',
      }),
    ),
    'Deleted board "Backlog" in Backlog',
  );
});

