import assert from 'node:assert/strict';
import test from 'node:test';
import { formatJiraSyncSummary } from '@/modules/inbox/utils/formatJiraSyncSummary';

function resultWithCounts(added: number, modified: number, removed: number) {
  return {
    created: Array.from({ length: added }, (_, index) => index),
    updated: Array.from({ length: modified }, (_, index) => index),
    deleted: Array.from({ length: removed }, (_, index) => index),
  };
}

test('formatJiraSyncSummary lists added, modified, and removed counts', () => {
  assert.equal(
    formatJiraSyncSummary(resultWithCounts(2, 1, 3)),
    '2 added, 1 modified and 3 removed',
  );
});

test('formatJiraSyncSummary includes zero counts', () => {
  assert.equal(
    formatJiraSyncSummary(resultWithCounts(0, 0, 0)),
    '0 added, 0 modified and 0 removed',
  );
});
