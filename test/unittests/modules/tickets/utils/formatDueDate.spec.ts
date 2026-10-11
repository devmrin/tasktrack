import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDueDate } from '@/modules/tickets/utils/formatDueDate';

test('full due date includes the year', () => {
  const formatted = formatDueDate('2026-10-15');
  assert.ok(formatted);
  assert.match(formatted, /2026/);
  assert.match(formatted, /15/);
});

test('compact due date is month and day only', () => {
  const formatted = formatDueDate('2026-10-15', { compact: true });
  assert.ok(formatted);
  assert.equal(formatted.includes('2026'), false);
  assert.match(formatted, /15/);
});

test('rejects dates that are not YYYY-MM-DD', () => {
  assert.equal(formatDueDate(undefined), undefined);
  assert.equal(formatDueDate(''), undefined);
  assert.equal(formatDueDate('15 Oct 2026'), undefined);
  assert.equal(formatDueDate('2026-02-31', { compact: true }), undefined);
});
