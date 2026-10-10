import assert from 'node:assert/strict';
import test from 'node:test';
import type { Column, Ticket, TransactionRecord } from '@/db/database';
import {
  computeBoardSummaryMetrics,
  findInProgressColumn,
  isDoneColumnTitle,
} from '@/modules/summary/utils/computeBoardSummaryMetrics';

const NOW = Date.parse('2026-10-10T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function column(partial: Partial<Column> & Pick<Column, 'id' | 'title' | 'order'>): Column {
  return {
    boardId: 'board-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function ticket(
  partial: Partial<Ticket> & Pick<Ticket, 'id' | 'title' | 'columnId'>,
): Ticket {
  return {
    type: 'local',
    boardId: 'board-1',
    order: 0,
    createdAt: NOW - DAY,
    updatedAt: NOW - DAY,
    ...partial,
  };
}

test('isDoneColumnTitle matches done/complete', () => {
  assert.equal(isDoneColumnTitle('Done'), true);
  assert.equal(isDoneColumnTitle('Completed'), true);
  assert.equal(isDoneColumnTitle('In Progress'), false);
});

test('findInProgressColumn prefers title match then second column', () => {
  const columns = [
    column({ id: 'c1', title: 'To Do', order: 0 }),
    column({ id: 'c2', title: 'Doing', order: 1 }),
    column({ id: 'c3', title: 'Done', order: 2 }),
  ];
  assert.equal(findInProgressColumn(columns)?.id, 'c2');

  const withProgress = [
    column({ id: 'c1', title: 'To Do', order: 0 }),
    column({ id: 'c2', title: 'In Progress', order: 1 }),
  ];
  assert.equal(findInProgressColumn(withProgress)?.id, 'c2');
});

test('computeBoardSummaryMetrics counts base KPIs', () => {
  const columns = [
    column({ id: 'todo', title: 'To Do', order: 0 }),
    column({ id: 'progress', title: 'In Progress', order: 1 }),
    column({ id: 'done', title: 'Done', order: 2 }),
  ];

  const tickets = [
    ticket({
      id: 't1',
      title: 'New',
      columnId: 'todo',
      createdAt: NOW - 2 * DAY,
      updatedAt: NOW - DAY,
      dueDate: '2026-10-12',
    }),
    ticket({
      id: 't2',
      title: 'Active',
      columnId: 'progress',
      createdAt: NOW - 30 * DAY,
      updatedAt: NOW - DAY,
      priority: 'High',
    }),
    ticket({
      id: 't3',
      title: 'Finished',
      columnId: 'done',
      createdAt: NOW - 30 * DAY,
      updatedAt: NOW - DAY,
    }),
  ];

  const transactions: TransactionRecord[] = [
    {
      id: 'tx1',
      createdAt: NOW - DAY,
      boardId: 'board-1',
      eventType: 'ticket_moved',
      ticketId: 't3',
      toColumnId: 'done',
      toColumnTitle: 'Done',
    },
  ];

  const metrics = computeBoardSummaryMetrics({
    tickets,
    columns,
    transactions,
    now: NOW,
    focusEnabled: false,
  });

  assert.equal(metrics.totalItems, 3);
  assert.equal(metrics.kpis.length, 4);
  assert.equal(metrics.kpis.find((k) => k.id === 'completed')?.value, 1);
  assert.equal(metrics.kpis.find((k) => k.id === 'updated')?.value, 3);
  assert.equal(metrics.kpis.find((k) => k.id === 'created')?.value, 1);
  assert.equal(metrics.kpis.find((k) => k.id === 'dueSoon')?.value, 1);
  assert.equal(metrics.workTypes.find((w) => w.name === 'Local')?.count, 3);
});

test('computeBoardSummaryMetrics adds focus KPIs when enabled', () => {
  const columns = [
    column({ id: 'todo', title: 'To Do', order: 0 }),
    column({ id: 'progress', title: 'In Progress', order: 1 }),
  ];
  const focused = ticket({
    id: 'focus',
    title: 'Deep work',
    columnId: 'progress',
    customKey: 'LOC-1',
  });
  const tickets = [
    focused,
    ticket({ id: 't2', title: 'Other', columnId: 'progress' }),
    ticket({ id: 't3', title: 'Backlog', columnId: 'todo' }),
  ];

  const metrics = computeBoardSummaryMetrics({
    tickets,
    columns,
    transactions: [],
    now: NOW,
    focusEnabled: true,
    focusedTicket: focused,
  });

  assert.equal(metrics.kpis.length, 6);
  assert.equal(metrics.kpis.find((k) => k.id === 'focusNow')?.value, 'LOC-1 · Deep work');
  assert.equal(metrics.kpis.find((k) => k.id === 'readyToFocus')?.value, 2);
});
