import type { Ticket } from '@/db/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { useToast } from '@/hooks/useToast';
import {
  createTicket,
  deleteTicket,
  getAllTickets,
  getJiraTickets,
  getTicketsByColumn,
  moveTicket,
  reorderTicketInColumn,
  updateTicket,
} from '@/modules/tickets/services/ticket.service';

export function useAllTicketsQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardId ? queryKeys.tickets.all(boardId) : ['tickets', 'none'],
    queryFn: () => {
      if (!boardId) throw new Error('boardId required');
      return getAllTickets(boardId);
    },
    enabled: !!boardId,
  });
}

export function useTicketsByColumnQuery(boardId: string | undefined, columnId: string) {
  return useQuery({
    queryKey: boardId ? queryKeys.tickets.column(boardId, columnId) : ['tickets', 'none', columnId],
    queryFn: () => {
      if (!boardId) throw new Error('boardId required');
      return getTicketsByColumn(boardId, columnId);
    },
    enabled: !!boardId && !!columnId,
  });
}

export function useJiraTicketsQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardId ? queryKeys.tickets.jira(boardId) : ['tickets', 'none', 'jira'],
    queryFn: () => {
      if (!boardId) throw new Error('boardId required');
      return getJiraTickets(boardId);
    },
    enabled: !!boardId,
  });
}

type CreateTicketInput = Parameters<typeof createTicket>[0];

export function useCreateTicketMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: (_, variables) => {
      const bid = variables.boardId;
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(bid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.column(bid, variables.columnId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira(bid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.inbox(bid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('Saved');
    },
    onError: () => {
      showToast('Failed to create item');
    },
  });
}

export function useUpdateTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Ticket, 'id' | 'createdAt'>>;
    }) => updateTicket(id, updates),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });
}

export function useMoveTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      newColumnId,
      targetTicketId,
    }: {
      ticketId: string;
      newColumnId: string;
      targetTicketId?: string;
    }) => moveTicket(ticketId, newColumnId, targetTicketId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });
}

export function useReorderTicketInColumnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      overTicketId,
      columnId,
    }: {
      ticketId: string;
      overTicketId: string;
      columnId: string;
    }) => reorderTicketInColumn(ticketId, overTicketId, columnId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useDeleteTicketMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (ticketId: string) => deleteTicket(ticketId),
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.inbox(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('Item deleted');
    },
    onError: () => {
      showToast('Failed to delete item');
    },
  });
}
