import assert from 'node:assert/strict';
import test from 'node:test';
import { boardTerminologyFromJiraEnabled } from '@/modules/boards/utils/boardTerminology';

test('ticket wording when JIRA enabled for board', () => {
  const t = boardTerminologyFromJiraEnabled(true);
  assert.equal(t.item, 'ticket');
  assert.equal(t.Items, 'Tickets');
});

test('task wording when JIRA disabled for board', () => {
  const t = boardTerminologyFromJiraEnabled(false);
  assert.equal(t.item, 'task');
  assert.equal(t.Items, 'Tasks');
});
