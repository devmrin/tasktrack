import { createContext } from 'react';
import type { Board } from '@/db/database';

export interface ActiveBoardContextValue {
  readonly boards: Board[];
  readonly activeBoard: Board | undefined;
  readonly activeBoardId: string | undefined;
  readonly setActiveBoardId: (id: string) => void;
  readonly isLoading: boolean;
  readonly isBoardsFetching: boolean;
}

export const ActiveBoardContext = createContext<ActiveBoardContextValue | null>(
  null,
);
