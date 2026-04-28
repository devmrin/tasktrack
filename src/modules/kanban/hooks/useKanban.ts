import { useQueryClient } from '@tanstack/react-query';
import type { Ticket } from '@/db/database';
import type { Column } from '@/modules/kanban/types';
import { queryKeys } from '@/hooks/queryKeys';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import { MAX_COLUMN_TITLE_LENGTH } from '@/modules/kanban/constants';
import {
  useColumnsQuery,
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
  useUpdateColumnMutation,
} from '@/modules/kanban/hooks/useColumnsQuery';
import {
  useAllTicketsQuery,
  useDeleteTicketMutation,
  useMoveTicketMutation,
  useUpdateTicketMutation,
} from '@/modules/tickets/hooks/useTicketsQuery';
import type { TicketPriority } from '@/modules/tickets';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';

function sortTicketsByOrder(a: Ticket, b: Ticket): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
}

export function useKanban() {
  const queryClient = useQueryClient();
  const { activeBoardId, isLoading: boardsLoading } = useActiveBoard();
  const columnsQuery = useColumnsQuery(activeBoardId);
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const updateColumnMutation = useUpdateColumnMutation(activeBoardId);
  const createColumnMutation = useCreateColumnMutation(activeBoardId);
  const deleteColumnMutation = useDeleteColumnMutation(activeBoardId);
  const reorderColumnsMutation = useReorderColumnsMutation(activeBoardId);
  const moveTicketMutation = useMoveTicketMutation();
  const updateTicketMutation = useUpdateTicketMutation();
  const deleteTicketMutation = useDeleteTicketMutation(activeBoardId);

  const columns: Column[] = columnsQuery.data ?? [];
  const tickets: Ticket[] = ticketsQuery.data ?? [];
  const loading =
    boardsLoading || columnsQuery.isLoading || ticketsQuery.isLoading || activeBoardId === undefined;

  const normalizeColumnTitle = (title: string): string =>
    title.trim().slice(0, MAX_COLUMN_TITLE_LENGTH);

  const handleColumnTitleUpdate = (columnId: string, newTitle: string) => {
    const normalizedTitle = normalizeColumnTitle(newTitle);
    if (!normalizedTitle) {
      return;
    }
    updateColumnMutation.mutate({ columnId, updates: { title: normalizedTitle } });
  };

  const handleTicketMove = (ticketId: string, newColumnId: string) => {
    moveTicketMutation.mutate({ ticketId, newColumnId });
  };

  const handleTicketUpdate = (
    ticketId: string,
    updates: { title?: string; description?: string; priority?: TicketPriority }
  ) => {
    updateTicketMutation.mutate({ id: ticketId, updates });
  };

  const handleTicketDelete = (ticketId: string) => {
    deleteTicketMutation.mutate(ticketId);
  };

  const handleColumnReorder = (newOrder: string[]) => {
    reorderColumnsMutation.mutate(newOrder);
  };

  const handleColumnCreate = (title: string) => {
    const normalizedTitle = normalizeColumnTitle(title);
    if (!normalizedTitle) {
      return;
    }
    createColumnMutation.mutate(normalizedTitle);
  };

  const handleColumnDelete = (columnId: string) => {
    deleteColumnMutation.mutate({
      columnId,
      destinationColumnId: INBOX_COLUMN_ID,
    });
  };

  const getTicketsForColumn = (columnId: string): Ticket[] => {
    return tickets.filter((ticket) => ticket.columnId === columnId).sort(sortTicketsByOrder);
  };

  const refresh = () => {
    if (!activeBoardId) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.columns(activeBoardId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(activeBoardId) });
  };

  return {
    columns,
    tickets,
    loading,
    handleColumnTitleUpdate,
    handleColumnCreate,
    handleColumnDelete,
    handleTicketMove,
    handleTicketDelete,
    handleTicketUpdate,
    handleColumnReorder,
    getTicketsForColumn,
    refresh,
    creatingColumn: createColumnMutation.isPending,
    deletingColumn: deleteColumnMutation.isPending,
    deletingTicket: deleteTicketMutation.isPending,
    activeBoardId,
  };
}
