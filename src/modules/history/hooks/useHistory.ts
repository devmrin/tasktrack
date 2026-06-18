import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import {
  deleteHistoryTransactions,
  getHistoryTransactions,
} from '@/modules/history/services/history.service';
import type { HistoryDeleteRange, HistoryQueryFilters } from '@/modules/history/types';
import { useToast } from '@/hooks/useToast';

export function useHistoryTransactionsQuery(filters: HistoryQueryFilters) {
  return useQuery({
    queryKey: queryKeys.history.list(filters),
    queryFn: () => getHistoryTransactions(filters),
  });
}

export function useDeleteHistoryTransactionsMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (dateRange: HistoryDeleteRange) => deleteHistoryTransactions(dateRange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('History deleted');
    },
    onError: () => {
      showToast('Failed to delete history');
    },
  });
}

