import assert from 'node:assert/strict';
import test from 'node:test';
import { getDueDateTone } from '@/modules/tickets/utils/dueDateTone';

const today = new Date(2026, 9, 14);

function isoDaysFromToday(days: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

test('due tomorrow, today, or overdue is urgent', () => {
  assert.equal(getDueDateTone(isoDaysFromToday(1), today), 'urgent');
  assert.equal(getDueDateTone(isoDaysFromToday(0), today), 'urgent');
  assert.equal(getDueDateTone(isoDaysFromToday(-3), today), 'urgent');
});

test('due in two to four days is soon', () => {
  assert.equal(getDueDateTone(isoDaysFromToday(2), today), 'soon');
  assert.equal(getDueDateTone(isoDaysFromToday(4), today), 'soon');
});

test('due more than four days out is normal', () => {
  assert.equal(getDueDateTone(isoDaysFromToday(5), today), 'normal');
  assert.equal(getDueDateTone(isoDaysFromToday(30), today), 'normal');
});

test('missing or invalid due dates have no tone', () => {
  assert.equal(getDueDateTone(undefined, today), undefined);
  assert.equal(getDueDateTone('15 Oct 2026', today), undefined);
  assert.equal(getDueDateTone('2026-02-31', today), undefined);
});
