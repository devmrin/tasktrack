import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { useToast } from '@/hooks/useToast';
import {
  createColumnWithNextOrder,
  deleteColumnAndMoveTickets,
  getAllColumns,
  reorderColumns,
  updateColumn,
} from '@/modules/kanban/services/column.service';
import type { Column } from '@/modules/kanban/types';

export function useColumnsQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardId ? queryKeys.columns(boardId) : ['columns', 'none'],
    queryFn: () => {
      if (!boardId) throw new Error('boardId required');
      return getAllColumns(boardId);
    },
    enabled: !!boardId,
  });
}

export function useUpdateColumnMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ columnId, updates }: { columnId: string; updates: Partial<Omit<Column, 'id' | 'createdAt'>> }) =>
      updateColumn(columnId, updates),
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.columns(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['columns'] });
      }
      showToast('Column renamed');
    },
    onError: () => {
      showToast('Failed to rename column');
    },
  });
}

export function useReorderColumnsMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnIds: string[]) => reorderColumns(columnIds),
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.columns(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['columns'] });
      }
    },
  });
}

export function useCreateColumnMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (title: string) => {
      if (!boardId) throw new Error('boardId required');
      return createColumnWithNextOrder(title, boardId);
    },
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.columns(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['columns'] });
      }
      showToast('Column created');
    },
    onError: () => {
      showToast('Failed to create column');
    },
  });
}

export function useDeleteColumnMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({
      columnId,
      destinationColumnId,
    }: {
      columnId: string;
      destinationColumnId: string;
    }) => deleteColumnAndMoveTickets(columnId, destinationColumnId),
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.columns(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.inbox(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['columns'] });
        void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('Column deleted');
    },
    onError: () => {
      showToast('Failed to delete column');
    },
  });
}
