import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionRecord } from '@/db/database';
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

