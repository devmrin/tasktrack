import { db, type Column, type Ticket } from '@/db/database';
import { recordHistoryTransaction } from '@/modules/history/services/history.service';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';

function sortTicketsByOrder(a: Ticket, b: Ticket): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
}

async function getTicketsInBoardColumn(boardId: string, columnId: string): Promise<Ticket[]> {
  return (await db.tickets
    .where('boardId')
    .equals(boardId)
    .filter((t) => t.columnId === columnId)
    .toArray()).sort(sortTicketsByOrder);
}

export async function createColumn(column: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>): Promise<Column> {
  const now = Date.now();
  const newColumn: Column = {
    ...column,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.columns.add(newColumn);
  return newColumn;
}

export async function getColumn(id: string): Promise<Column | undefined> {
  return db.columns.get(id);
}

export async function getAllColumns(boardId: string): Promise<Column[]> {
  return db.columns.where('boardId').equals(boardId).sortBy('order');
}

export async function updateColumn(id: string, updates: Partial<Omit<Column, 'id' | 'createdAt'>>): Promise<void> {
  await db.columns.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteColumn(id: string): Promise<void> {
  await db.columns.delete(id);
}

export async function createColumnWithNextOrder(title: string, boardId: string): Promise<Column> {
  const existingColumns = await getAllColumns(boardId);
  return createColumn({
    boardId,
    title,
    order: existingColumns.length,
  });
}

export async function deleteColumnAndMoveTickets(
  columnId: string,
  destinationColumnId: string,
): Promise<void> {
  const boardIdForHistory = (await db.columns.get(columnId))?.boardId;

  let movedCount = 0;
  let sourceColumnTitle: string | undefined;
  let destinationColumnTitle: string | undefined;

  await db.transaction('rw', db.columns, db.tickets, async () => {
    const sourceColumn = await db.columns.get(columnId);
    if (!sourceColumn) {
      throw new Error('Column not found');
    }
    const bId = sourceColumn.boardId;

    if (destinationColumnId !== INBOX_COLUMN_ID) {
      const destinationColumn = await db.columns.get(destinationColumnId);
      if (!destinationColumn || destinationColumn.boardId !== bId) {
        throw new Error('Destination column must belong to the same board');
      }
    }

    const [sourceTickets, destinationTickets] = await Promise.all([
      getTicketsInBoardColumn(bId, columnId),
      getTicketsInBoardColumn(bId, destinationColumnId),
    ]);
    movedCount = sourceTickets.length;
    sourceColumnTitle = sourceColumn.title;
    destinationColumnTitle =
      destinationColumnId === INBOX_COLUMN_ID
        ? 'Inbox'
        : (await db.columns.get(destinationColumnId))?.title;

    const now = Date.now();
    const orderedDestinationTickets = [...destinationTickets].sort(sortTicketsByOrder);
    const orderedSourceTickets = [...sourceTickets].sort(sortTicketsByOrder);

    for (const [index, ticket] of orderedSourceTickets.entries()) {
      await db.tickets.update(ticket.id, {
        columnId: destinationColumnId,
        order: orderedDestinationTickets.length + index,
        updatedAt: now,
      });
    }

    await db.columns.delete(columnId);

    const remainingColumns = await getAllColumns(bId);
    remainingColumns.sort((a, b) => a.order - b.order);
    for (const [index, column] of remainingColumns.entries()) {
      if (column.order !== index) {
        await db.columns.update(column.id, {
          order: index,
          updatedAt: now,
        });
      }
    }
  });

  await recordHistoryTransaction({
    eventType: 'column_deleted_bulk_move',
    boardId: boardIdForHistory,
    fromColumnId: columnId,
    toColumnId: destinationColumnId,
    summary: `Deleted column "${sourceColumnTitle ?? 'Unknown'}" and moved ${movedCount} tickets to "${destinationColumnTitle ?? 'Unknown'}"`,
  });
}

export async function reorderColumns(columnIds: string[]): Promise<void> {
  if (columnIds.length === 0) {
    return;
  }

  const firstCol = await db.columns.get(columnIds[0]);
  if (!firstCol) {
    throw new Error('Unknown column');
  }
  const boardId = firstCol.boardId;
  for (const cid of columnIds) {
    const c = await db.columns.get(cid);
    if (!c || c.boardId !== boardId) {
      throw new Error('Cannot reorder columns across boards');
    }
  }

  const updates = columnIds.map((id, index) => ({
    id,
    order: index,
  }));

  await db.transaction('rw', db.columns, async () => {
    const now = Date.now();
    for (const update of updates) {
      await db.columns.update(update.id, { order: update.order, updatedAt: now });
    }
  });
}

export async function initializeDefaultColumns(boardId: string): Promise<void> {
  const existingColumns = await getAllColumns(boardId);
  if (existingColumns.length > 0) {
    return;
  }

  const defaultColumns = [
    { title: 'Todo', order: 0 },
    { title: 'Working', order: 1 },
    { title: 'Done', order: 2 },
  ];

  for (const column of defaultColumns) {
    await createColumn({
      boardId,
      title: column.title,
      order: column.order,
    });
  }
}
