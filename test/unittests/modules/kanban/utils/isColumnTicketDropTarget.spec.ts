import assert from 'node:assert/strict';
import test from 'node:test';
import { isColumnTicketDropTarget } from '@/modules/kanban/utils/isColumnTicketDropTarget';

const columnId = 'column-a';

test('highlights a column when the pointer is over its empty space', () => {
  assert.equal(isColumnTicketDropTarget(columnId, true, true, null), true);
});

test('highlights a full column when the pointer is over one of its tickets', () => {
  assert.equal(
    isColumnTicketDropTarget(columnId, true, false, {
      type: 'ticket',
      columnId,
    }),
    true,
  );
});

test("does not highlight a column when the pointer is over another column's ticket", () => {
  assert.equal(
    isColumnTicketDropTarget(columnId, true, false, {
      type: 'ticket',
      columnId: 'column-b',
    }),
    false,
  );
});

test('does not show the ticket drop highlight while dragging a column', () => {
  assert.equal(
    isColumnTicketDropTarget(columnId, false, true, {
      type: 'ticket',
      columnId,
    }),
    false,
  );
});
