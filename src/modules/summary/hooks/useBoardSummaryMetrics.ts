import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { TransactionRecord } from '@/db/database';
import { queryKeys } from '@/hooks/queryKeys';
import { useActiveBoard } from '@/modules/boards';
import { useFocusZone, usePomodoroSettings } from '@/modules/focus';
import {
  createHistoryDateRangeFromPreset,
  formatTransactionMessageWithoutBoard,
  getHistoryTransactions,
} from '@/modules/history';
import { useColumnsQuery } from '@/modules/kanban';
import {
  computeBoardSummaryMetrics,
  type BoardSummaryMetrics,
} from '@/modules/summary/utils/computeBoardSummaryMetrics';
import { useAllTicketsQuery } from '@/modules/tickets';

export interface SummaryActivityItem {
  readonly id: string;
  readonly message: string;
  readonly createdAt: number;
}

export function useBoardSummaryMetrics(): {
  readonly metrics: BoardSummaryMetrics | null;
  readonly recentActivity: SummaryActivityItem[];
  readonly loading: boolean;
  readonly focusEnabled: boolean;
} {
  const { activeBoardId } = useActiveBoard();
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const columnsQuery = useColumnsQuery(activeBoardId);
  const { settings: focusSettings } = usePomodoroSettings();
  const { focusedData } = useFocusZone();

  const historyFilters = useMemo(
    () => ({
      boardId: activeBoardId ?? null,
      dateRange: createHistoryDateRangeFromPreset('last30Days'),
    }),
    [activeBoardId],
  );

  const historyQuery = useQuery({
    queryKey: queryKeys.history.list(historyFilters),
    queryFn: () => getHistoryTransactions(historyFilters),
    enabled: !!activeBoardId,
  });

  const metrics = useMemo(() => {
    if (!activeBoardId || !ticketsQuery.data || !columnsQuery.data) {
      return null;
    }
    return computeBoardSummaryMetrics({
      tickets: ticketsQuery.data,
      columns: columnsQuery.data,
      transactions: historyQuery.data ?? [],
      focusEnabled: focusSettings.enabled,
      focusedTicket: focusedData?.ticket ?? null,
    });
  }, [
    activeBoardId,
    ticketsQuery.data,
    columnsQuery.data,
    historyQuery.data,
    focusSettings.enabled,
    focusedData?.ticket,
  ]);

  const recentActivity = useMemo(() => {
    const txs: TransactionRecord[] = historyQuery.data ?? [];
    return txs.slice(0, 8).map((tx) => ({
      id: tx.id,
      message: formatTransactionMessageWithoutBoard(tx),
      createdAt: tx.createdAt,
    }));
  }, [historyQuery.data]);

  return {
    metrics,
    recentActivity,
    loading:
      ticketsQuery.isLoading
      || columnsQuery.isLoading
      || historyQuery.isLoading,
    focusEnabled: focusSettings.enabled,
  };
}
