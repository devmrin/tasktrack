import {
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Board } from '@/db/database';
import {
  ActiveBoardContext,
  type ActiveBoardContextValue,
} from '@/contexts/activeBoardContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ACTIVE_BOARD_STORAGE_KEY } from '@/modules/boards/constants/board.constants';
import { useBoardsQuery } from '@/modules/boards/hooks/useBoardsQuery';

export function ActiveBoardProvider({ children }: { readonly children: ReactNode }) {
  const boardsQuery = useBoardsQuery();
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const [storedBoardId, setStoredBoardId] = useLocalStorage<string | null>(
    ACTIVE_BOARD_STORAGE_KEY,
    null,
  );

  const defaultBoard = useMemo(
    () => boards.find((b) => b.isDefault) ?? boards[0],
    [boards],
  );

  const activeBoardId = useMemo(() => {
    if (boards.length === 0) {
      return undefined;
    }
    if (storedBoardId && boards.some((b) => b.id === storedBoardId)) {
      return storedBoardId;
    }
    return defaultBoard?.id;
  }, [boards, storedBoardId, defaultBoard]);

  const setActiveBoardId = useCallback(
    (id: string) => {
      setStoredBoardId(id);
    },
    [setStoredBoardId],
  );

  const activeBoard: Board | undefined = useMemo(
    () => boards.find((b) => b.id === activeBoardId),
    [boards, activeBoardId],
  );

  const value = useMemo<ActiveBoardContextValue>(
    () => ({
      boards,
      activeBoard,
      activeBoardId,
      setActiveBoardId,
      isLoading: boardsQuery.isLoading,
      isBoardsFetching: boardsQuery.isFetching,
    }),
    [
      boards,
      activeBoard,
      activeBoardId,
      setActiveBoardId,
      boardsQuery.isLoading,
      boardsQuery.isFetching,
    ],
  );

  return <ActiveBoardContext.Provider value={value}>{children}</ActiveBoardContext.Provider>;
}
