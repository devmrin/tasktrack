import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractJiraSubtasks,
  getTicketSubtaskCount,
  groupSubtasksByParent,
  isJiraSubtaskDone,
  isUsableJiraSubtaskField,
} from '@/modules/tickets/utils/jiraSubtasks';

test('extracts subtask summary, status, and assignee', () => {
  const parsed = extractJiraSubtasks([
    {
      id: 20,
      key: 'proj-2',
      fields: {
        summary: 'Write the empty state',
        status: {
          name: 'In Progress',
          statusCategory: { key: 'indeterminate' },
        },
        assignee: { displayName: 'Ada' },
      },
    },
    { id: '21', key: 'PROJ-3' },
    { id: '22', key: 'not a key', fields: { summary: 'Skipped' } },
    null,
  ]);

  assert.deepEqual(parsed, [
    {
      id: '20',
      key: 'PROJ-2',
      summary: 'Write the empty state',
      status: 'In Progress',
      statusCategory: 'indeterminate',
      assignee: 'Ada',
    },
  ]);
});

test('embedded subtask field is unusable when a child has no summary', () => {
  assert.equal(isUsableJiraSubtaskField([]), true);
  assert.equal(isUsableJiraSubtaskField(null), false);
  assert.equal(
    isUsableJiraSubtaskField([
      { id: '1', key: 'PROJ-2', fields: { summary: 'Ready' } },
    ]),
    true,
  );
  assert.equal(
    isUsableJiraSubtaskField([{ id: '1', key: 'PROJ-2' }]),
    false,
  );
});

test('groups fetched child issues under their parent and skips duplicates', () => {
  const grouped = groupSubtasksByParent([
    {
      id: '2',
      key: 'PROJ-2',
      fields: {
        summary: 'First',
        status: { name: 'Done', statusCategory: { key: 'done' } },
        parent: { key: 'proj-1' },
      },
    },
    {
      id: '2',
      key: 'PROJ-2',
      fields: {
        summary: 'First',
        parent: { key: 'PROJ-1' },
      },
    },
    {
      id: '3',
      key: 'PROJ-3',
      fields: {
        summary: 'Second',
        status: { name: 'To Do', statusCategory: { key: 'new' } },
        parent: { key: 'PROJ-1' },
      },
    },
    {
      id: '4',
      key: 'PROJ-4',
      fields: {
        summary: 'Other parent',
        parent: { key: 'PROJ-9' },
      },
    },
  ]);

  assert.deepEqual(
    grouped.get('PROJ-1')?.map((subtask) => subtask.key),
    ['PROJ-2', 'PROJ-3'],
  );
  assert.equal(grouped.get('PROJ-1')?.[0]?.statusCategory, 'done');
  assert.deepEqual(grouped.get('PROJ-9')?.map((subtask) => subtask.summary), ['Other parent']);
});

test('counts subtasks and treats done status as complete', () => {
  assert.equal(getTicketSubtaskCount({}), 0);
  assert.equal(getTicketSubtaskCount({
    jiraData: {
      jiraId: '1',
      jiraUrl: 'https://example.atlassian.net/browse/PROJ-1',
      jiraKey: 'PROJ-1',
      subtasks: [
        { id: '2', key: 'PROJ-2', summary: 'One' },
        { id: '3', key: 'PROJ-3', summary: 'Two' },
      ],
    },
  }), 2);
  assert.equal(isJiraSubtaskDone({ statusCategory: 'done', status: 'Resolved' }), true);
  assert.equal(isJiraSubtaskDone({ status: 'Done' }), true);
  assert.equal(isJiraSubtaskDone({ status: 'To Do', statusCategory: 'new' }), false);
});
