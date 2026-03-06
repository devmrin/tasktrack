import { db, type Ticket } from '@/db/database';
import { recordHistoryTransaction } from '@/modules/history/services/history.service';
import type { TicketPriority } from '@/utils/ticketPriority';
import { dispatchTicketsRemoved } from '@/utils/ticketsRemoved';
import { dispatchTicketMoved } from '@/utils/ticketsMoved';

type CreateTicketInput = Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'priority'> & {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  order?: number;
  priority?: TicketPriority;
};

function sortTicketsByOrder(a: Ticket, b: Ticket): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
}

async function getNextOrderForColumn(columnId: string): Promise<number> {
  const columnTickets = await db.tickets.where('columnId').equals(columnId).toArray();
  if (columnTickets.length === 0) {
    return 0;
  }
  const sortedTickets = [...columnTickets];
  sortedTickets.sort(sortTicketsByOrder);
  const lastTicket = sortedTickets.at(-1);
  return (lastTicket?.order ?? -1) + 1;
}

export async function createTicket(ticket: CreateTicketInput): Promise<Ticket> {
  const now = Date.now();
  const nextOrder = ticket.order ?? (await getNextOrderForColumn(ticket.columnId));
  const newTicket: Ticket = {
    ...ticket,
    priority: ticket.priority,
    id: ticket.id ?? crypto.randomUUID(),
    order: nextOrder,
    createdAt: ticket.createdAt ?? now,
    updatedAt: ticket.updatedAt ?? now,
  };
  await db.tickets.add(newTicket);
  if (newTicket.type === 'local') {
    await recordHistoryTransaction({
      eventType: 'ticket_created_local',
      ticketId: newTicket.id,
      ticketTitle: newTicket.title,
      ticketKey: newTicket.customKey,
      toColumnId: newTicket.columnId,
      summary: 'Created local ticket',
    });
  }
  return newTicket;
}

export async function getTicket(id: string): Promise<Ticket | undefined> {
  return db.tickets.get(id);
}

export async function getAllTickets(): Promise<Ticket[]> {
  const tickets = await db.tickets.toArray();
  return tickets.sort(sortTicketsByOrder);
}

export async function getTicketsByColumn(columnId: string): Promise<Ticket[]> {
  const tickets = await db.tickets.where('columnId').equals(columnId).toArray();
  return tickets.sort(sortTicketsByOrder);
}

export async function updateTicket(id: string, updates: Partial<Omit<Ticket, 'id' | 'createdAt'>>): Promise<void> {
  await db.tickets.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function getJiraTickets(): Promise<Ticket[]> {
  return db.tickets.where('type').equals('jira').toArray();
}

interface DeleteTicketOptions {
  readonly skipHistory?: boolean;
}

export async function deleteTicket(
  id: string,
  options?: DeleteTicketOptions,
): Promise<void> {
  const existingTicket = options?.skipHistory ? undefined : await db.tickets.get(id);
  await db.tickets.delete(id);
  if (!options?.skipHistory && existingTicket) {
    await recordHistoryTransaction({
      eventType: 'ticket_deleted',
      ticketId: existingTicket.id,
      ticketTitle: existingTicket.title,
      ticketKey: existingTicket.jiraData?.jiraKey ?? existingTicket.customKey,
      fromColumnId: existingTicket.columnId,
      summary: 'Deleted ticket',
    });
  }
  dispatchTicketsRemoved([id]);
}

export async function deleteTickets(
  ids: string[],
  options?: DeleteTicketOptions,
): Promise<void> {
  const existingTickets = options?.skipHistory
    ? []
    : await db.tickets.bulkGet(ids);
  await db.tickets.bulkDelete(ids);
  if (!options?.skipHistory) {
    for (const ticket of existingTickets) {
      if (!ticket) continue;
      await recordHistoryTransaction({
        eventType: 'ticket_deleted',
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        ticketKey: ticket.jiraData?.jiraKey ?? ticket.customKey,
        fromColumnId: ticket.columnId,
        summary: 'Deleted ticket',
      });
    }
  }
  dispatchTicketsRemoved(ids);
}

export async function reorderTicketInColumn(
  ticketId: string,
  overTicketId: string,
  columnId: string
): Promise<void> {
  await db.transaction('rw', db.tickets, async () => {
    const columnTickets = (
      await db.tickets.where('columnId').equals(columnId).toArray()
    ).sort(sortTicketsByOrder);

    const oldIndex = columnTickets.findIndex((t) => t.id === ticketId);
    const newIndex = columnTickets.findIndex((t) => t.id === overTicketId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    const reordered = [...columnTickets];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    const now = Date.now();
    for (const [index, ticket] of reordered.entries()) {
      await db.tickets.update(ticket.id, { order: index, updatedAt: now });
    }
  });
}

export async function moveTicket(
  ticketId: string,
  newColumnId: string,
  targetTicketId?: string
): Promise<void> {
  let moved = false;
  let movedTicketInfo:
    | {
        ticketId: string;
        ticketTitle: string;
        ticketKey?: string;
        sourceColumnId: string;
      }
    | undefined;
  await db.transaction('rw', db.tickets, async () => {
    const movingTicket = await db.tickets.get(ticketId);
    if (!movingTicket) {
      return;
    }

    const sourceColumnId = movingTicket.columnId;
    movedTicketInfo = {
      ticketId: movingTicket.id,
      ticketTitle: movingTicket.title,
      ticketKey: movingTicket.jiraData?.jiraKey ?? movingTicket.customKey,
      sourceColumnId,
    };
    const destinationTickets = (
      await db.tickets.where('columnId').equals(newColumnId).toArray()
    )
      .filter((ticket) => ticket.id !== ticketId)
      .sort(sortTicketsByOrder);

    let insertAt = destinationTickets.length;
    if (targetTicketId) {
      const targetIndex = destinationTickets.findIndex((ticket) => ticket.id === targetTicketId);
      if (targetIndex >= 0) {
        insertAt = targetIndex;
      }
    }

    const reorderedDestination = [...destinationTickets];
    reorderedDestination.splice(insertAt, 0, { ...movingTicket, columnId: newColumnId });

    const now = Date.now();
    for (const [index, ticket] of reorderedDestination.entries()) {
      await db.tickets.update(ticket.id, {
        columnId: newColumnId,
        order: index,
        updatedAt: now,
      });
    }

    if (sourceColumnId === newColumnId) {
      return;
    }

    moved = true;

    const sourceTickets = (
      await db.tickets.where('columnId').equals(sourceColumnId).toArray()
    ).sort(sortTicketsByOrder);
    for (const [index, ticket] of sourceTickets.entries()) {
      await db.tickets.update(ticket.id, {
        order: index,
        updatedAt: now,
      });
    }
  });

  if (moved) {
    if (movedTicketInfo) {
      await recordHistoryTransaction({
        eventType: 'ticket_moved',
        ticketId: movedTicketInfo.ticketId,
        ticketTitle: movedTicketInfo.ticketTitle,
        ticketKey: movedTicketInfo.ticketKey,
        fromColumnId: movedTicketInfo.sourceColumnId,
        toColumnId: newColumnId,
        summary: 'Moved ticket',
      });
    }
    dispatchTicketMoved({ ticketId, newColumnId });
  }
}
