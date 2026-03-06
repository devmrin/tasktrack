import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import {
  deleteHistoryTransactions,
  getHistoryTransactions,
} from '@/modules/history/services/history.service';
import type { HistoryDateRange } from '@/modules/history/types';
import { useToast } from '@/hooks/useToast';

export function useHistoryTransactionsQuery(dateRange: HistoryDateRange) {
  return useQuery({
    queryKey: queryKeys.history.list(dateRange),
    queryFn: () => getHistoryTransactions(dateRange),
  });
}

export function useDeleteHistoryTransactionsMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (dateRange: HistoryDateRange) => deleteHistoryTransactions(dateRange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('History deleted');
    },
    onError: () => {
      showToast('Failed to delete history');
    },
  });
}

