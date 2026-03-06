import { db, type Column, type Ticket } from '@/db/database';
import { recordHistoryTransaction } from '@/modules/history/services/history.service';

function sortTicketsByOrder(a: Ticket, b: Ticket): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
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

export async function getAllColumns(): Promise<Column[]> {
  return db.columns.orderBy('order').toArray();
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

export async function createColumnWithNextOrder(title: string): Promise<Column> {
  const existingColumns = await getAllColumns();
  return createColumn({
    title,
    order: existingColumns.length,
  });
}

export async function deleteColumnAndMoveTickets(
  columnId: string,
  destinationColumnId: string
): Promise<void> {
  let movedCount = 0;
  let sourceColumnTitle: string | undefined;
  let destinationColumnTitle: string | undefined;
  await db.transaction('rw', db.columns, db.tickets, async () => {
    const [sourceTickets, destinationTickets, sourceColumn, destinationColumn] = await Promise.all([
      db.tickets.where('columnId').equals(columnId).toArray(),
      db.tickets.where('columnId').equals(destinationColumnId).toArray(),
      db.columns.get(columnId),
      db.columns.get(destinationColumnId),
    ]);
    movedCount = sourceTickets.length;
    sourceColumnTitle = sourceColumn?.title;
    destinationColumnTitle = destinationColumn?.title;

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

    const remainingColumns = await db.columns.orderBy('order').toArray();
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
    fromColumnId: columnId,
    toColumnId: destinationColumnId,
    summary: `Deleted column "${sourceColumnTitle ?? 'Unknown'}" and moved ${movedCount} tickets to "${destinationColumnTitle ?? 'Unknown'}"`,
  });
}

export async function reorderColumns(columnIds: string[]): Promise<void> {
  const updates = columnIds.map((id, index) => ({
    id,
    order: index,
  }));

  await db.transaction('rw', db.columns, async () => {
    for (const update of updates) {
      await db.columns.update(update.id, { order: update.order, updatedAt: Date.now() });
    }
  });
}

export async function initializeDefaultColumns(): Promise<void> {
  const existingColumns = await getAllColumns();
  if (existingColumns.length > 0) {
    return;
  }

  const defaultColumns = [
    { title: 'Todo', order: 0 },
    { title: 'Working', order: 1 },
    { title: 'Done', order: 2 },
  ];

  for (const column of defaultColumns) {
    await createColumn(column);
  }
}
