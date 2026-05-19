import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAbsoluteTimestamp,
  formatRelativeTimeAgo,
} from '@/utils/formatRelativeTimeAgo';

const now = new Date('2026-05-19T12:00:00.000Z');

test('formatRelativeTimeAgo returns now under one minute', () => {
  assert.equal(
    formatRelativeTimeAgo('2026-05-19T11:59:30.000Z', now),
    'now',
  );
});

test('formatRelativeTimeAgo returns minutes', () => {
  assert.equal(
    formatRelativeTimeAgo('2026-05-19T11:55:00.000Z', now),
    '5m ago',
  );
});

test('formatRelativeTimeAgo returns hours', () => {
  assert.equal(
    formatRelativeTimeAgo('2026-05-19T11:00:00.000Z', now),
    '1hr ago',
  );
});

test('formatRelativeTimeAgo returns days', () => {
  assert.equal(
    formatRelativeTimeAgo('2026-05-18T12:00:00.000Z', now),
    '1 day ago',
  );
  assert.equal(
    formatRelativeTimeAgo('2026-05-17T12:00:00.000Z', now),
    '2 days ago',
  );
});

test('formatAbsoluteTimestamp formats date and time', () => {
  const result = formatAbsoluteTimestamp('2026-05-19T14:05:00.000Z');
  assert.match(result, /^19 May 2026, \d{2}:05$/);
});
