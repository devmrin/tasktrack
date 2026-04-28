import { useMemo } from 'react';
import type { BoardTerminology } from '@/modules/boards/types/board.types';
import type { Board } from '@/db/database';
import { boardTerminologyFromJiraEnabled } from '@/modules/boards/utils/boardTerminology';

export function useBoardTerminology(board: Board | undefined): BoardTerminology {
  return useMemo(
    () => boardTerminologyFromJiraEnabled(board?.jiraEnabled ?? false),
    [board?.jiraEnabled],
  );
}
