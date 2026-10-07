import { useCallback, useMemo, type ReactNode } from 'react';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { StatusFilterContext } from '@/contexts/status-filter-context';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  isStatusFilterActive,
  parseStatusFilter,
  readStatusFilterStore,
  type StatusFilter,
  type StatusFilterOperator,
} from '@/modules/tickets/utils/statusFilter';

const STATUS_FILTER_STORAGE_KEY = 'tasktrack.statusFilter';

interface StatusFilterProviderProps {
  readonly children: ReactNode;
}

export function StatusFilterProvider({ children }: StatusFilterProviderProps) {
  const { activeBoardId } = useActiveBoard();
  const [stored, setStored] = useLocalStorage<Record<string, unknown>>(
    STATUS_FILTER_STORAGE_KEY,
    {},
  );

  const filter = useMemo(
    () => parseStatusFilter(activeBoardId ? readStatusFilterStore(stored)[activeBoardId] : undefined),
    [activeBoardId, stored],
  );

  const writeFilter = useCallback(
    (next: StatusFilter) => {
      if (!activeBoardId) {
        return;
      }
      setStored((prev) => ({
        ...readStatusFilterStore(prev),
        [activeBoardId]: {
          operator: next.operator,
          statuses: [...next.statuses],
        },
      }));
    },
    [activeBoardId, setStored],
  );

  const setOperator = useCallback(
    (operator: StatusFilterOperator) => {
      writeFilter({ operator, statuses: filter.statuses });
    },
    [filter.statuses, writeFilter],
  );

  const toggleStatus = useCallback(
    (status: string) => {
      const trimmed = status.trim();
      if (!trimmed) {
        return;
      }
      const selected = filter.statuses.includes(trimmed)
        ? filter.statuses.filter((item) => item !== trimmed)
        : [...filter.statuses, trimmed];
      writeFilter({ operator: filter.operator, statuses: selected });
    },
    [filter.operator, filter.statuses, writeFilter],
  );

  const clearStatuses = useCallback(() => {
    writeFilter({ operator: filter.operator, statuses: [] });
  }, [filter.operator, writeFilter]);

  const value = useMemo(
    () => ({
      filter,
      isActive: isStatusFilterActive(filter),
      setOperator,
      toggleStatus,
      clearStatuses,
    }),
    [filter, setOperator, toggleStatus, clearStatuses],
  );

  return <StatusFilterContext.Provider value={value}>{children}</StatusFilterContext.Provider>;
}
