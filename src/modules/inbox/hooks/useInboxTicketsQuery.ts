import { useQuery } from '@tanstack/react-query';
import { getAllColumns } from '@/modules/kanban';
import { getAllTickets, getTicketsByColumn, moveTicket } from '@/modules/tickets';
import { queryKeys } from '@/hooks/queryKeys';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';

async function loadInboxTickets(boardId: string) {
  const [columns, allTickets] = await Promise.all([
    getAllColumns(boardId),
    getAllTickets(boardId),
  ]);
  const validColumnIds = new Set([INBOX_COLUMN_ID, ...columns.map((c) => c.id)]);
  const orphanedTickets = allTickets.filter((t) => !validColumnIds.has(t.columnId));
  for (const ticket of orphanedTickets) {
    await moveTicket(ticket.id, INBOX_COLUMN_ID);
  }
  return getTicketsByColumn(boardId, INBOX_COLUMN_ID);
}

export function useInboxTicketsQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardId ? queryKeys.tickets.inbox(boardId) : ['tickets', 'none', 'inbox'],
    queryFn: () => {
      if (!boardId) throw new Error('boardId required');
      return loadInboxTickets(boardId);
    },
    enabled: !!boardId,
  });
}
