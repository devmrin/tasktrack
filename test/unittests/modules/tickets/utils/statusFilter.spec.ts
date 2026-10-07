import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectStatusOptions,
  formatStatusFilterSummary,
  parseStatusFilter,
  ticketMatchesStatusFilter,
} from '@/modules/tickets/utils/statusFilter';

test('inactive status filter matches every card', () => {
  assert.equal(
    ticketMatchesStatusFilter({ jiraData: { status: 'Done' } }, { operator: 'equals', statuses: [] }),
    true,
  );
  assert.equal(ticketMatchesStatusFilter({}, { operator: 'notEquals', statuses: [] }), true);
});

test('equals keeps cards whose status is checked', () => {
  const filter = { operator: 'equals' as const, statuses: ['Done', 'In Review'] };
  assert.equal(ticketMatchesStatusFilter({ jiraData: { status: 'Done' } }, filter), true);
  assert.equal(ticketMatchesStatusFilter({ jiraData: { status: 'To Do' } }, filter), false);
  assert.equal(ticketMatchesStatusFilter({}, filter), false);
});

test('not equals hides checked statuses and keeps cards with no status', () => {
  const filter = { operator: 'notEquals' as const, statuses: ['Done'] };
  assert.equal(ticketMatchesStatusFilter({ jiraData: { status: 'Done' } }, filter), false);
  assert.equal(ticketMatchesStatusFilter({ jiraData: { status: 'To Do' } }, filter), true);
  assert.equal(ticketMatchesStatusFilter({}, filter), true);
});

test('collects unique statuses and keeps a selected status that is no longer on a card', () => {
  const options = collectStatusOptions(
    [{ jiraData: { status: 'In Progress' } }, { jiraData: { status: 'Done' } }, { jiraData: { status: 'Done' } }],
    ['Blocked'],
  );
  assert.deepEqual(options, ['Blocked', 'Done', 'In Progress']);
});

test('parses stored filters and drops blank values', () => {
  assert.deepEqual(parseStatusFilter({ operator: 'notEquals', statuses: [' Done ', '', 'Done', 4] }), {
    operator: 'notEquals',
    statuses: ['Done'],
  });
  assert.deepEqual(parseStatusFilter(null), { operator: 'equals', statuses: [] });
});

test('formats the active filter the way the board summary shows it', () => {
  assert.equal(
    formatStatusFilterSummary({ operator: 'equals', statuses: ['Done', 'In Review'] }),
    'Status = Done, In Review',
  );
});
