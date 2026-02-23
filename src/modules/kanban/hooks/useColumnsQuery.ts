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

export function useColumnsQuery() {
  return useQuery({
    queryKey: queryKeys.columns,
    queryFn: getAllColumns,
  });
}

export function useUpdateColumnMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ columnId, updates }: { columnId: string; updates: Partial<Omit<Column, 'id' | 'createdAt'>> }) =>
      updateColumn(columnId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columns });
      showToast('Column renamed');
    },
    onError: () => {
      showToast('Failed to rename column');
    },
  });
}

export function useReorderColumnsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnIds: string[]) => reorderColumns(columnIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columns });
    },
  });
}

export function useCreateColumnMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (title: string) => createColumnWithNextOrder(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columns });
      showToast('Column created');
    },
    onError: () => {
      showToast('Failed to create column');
    },
  });
}

export function useDeleteColumnMutation() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.columns });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira });
      showToast('Column deleted');
    },
    onError: () => {
      showToast('Failed to delete column');
    },
  });
}
