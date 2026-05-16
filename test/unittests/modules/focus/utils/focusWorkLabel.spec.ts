import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ticket } from '@/db/database';
import { getFocusWorkLabel } from '@/modules/focus/utils/focusWorkLabel';

function baseTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: '1',
    title: 'Do the thing',
    type: 'local',
    boardId: 'b',
    columnId: 'c',
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

test('uses JIRA key from synced issue', () => {
  const ticket = baseTicket({
    type: 'jira',
    title: 'Issue title',
    jiraData: { jiraId: '1', jiraUrl: 'https://example/issue/1', jiraKey: 'PROJ-42' },
  });
  assert.equal(getFocusWorkLabel(ticket), 'PROJ-42');
});

test('uses validated custom key on local ticket', () => {
  const ticket = baseTicket({
    customKey: 'abc-99',
    title: 'Local task',
  });
  assert.equal(getFocusWorkLabel(ticket), 'ABC-99');
});

test('uses title when no JIRA key', () => {
  const ticket = baseTicket({ title: 'Only title' });
  assert.equal(getFocusWorkLabel(ticket), 'Only title');
});

test('uses title when custom key is not JIRA-shaped', () => {
  const ticket = baseTicket({
    customKey: 'not-a-jira-key',
    title: 'My task',
  });
  assert.equal(getFocusWorkLabel(ticket), 'My task');
});

test('strips HTML from title fallback', () => {
  const ticket = baseTicket({ title: '<b>Bold</b> task' });
  assert.equal(getFocusWorkLabel(ticket), 'Bold task');
});

test('fallback when title empty', () => {
  const ticket = baseTicket({ title: '   ' });
  assert.equal(getFocusWorkLabel(ticket), 'Time to focus!');
});
