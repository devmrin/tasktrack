import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHistoryRangeStart } from '@/modules/history/services/history.service';

const NOW = new Date('2026-03-06T16:30:00.000Z').getTime();
const START_OF_DAY = new Date('2026-03-06T00:00:00.000Z').getTime();

test('resolveHistoryRangeStart returns null for all-time range', () => {
  assert.equal(resolveHistoryRangeStart('all', NOW), null);
});

test('resolveHistoryRangeStart calculates today start boundary', () => {
  assert.equal(resolveHistoryRangeStart('today', NOW), START_OF_DAY);
});

test('resolveHistoryRangeStart calculates trailing day boundaries', () => {
  assert.equal(
    resolveHistoryRangeStart('last7Days', NOW),
    START_OF_DAY - 6 * 24 * 60 * 60 * 1000,
  );
  assert.equal(
    resolveHistoryRangeStart('last30Days', NOW),
    START_OF_DAY - 29 * 24 * 60 * 60 * 1000,
  );
});

