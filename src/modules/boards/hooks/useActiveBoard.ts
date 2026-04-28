import { useContext } from 'react';
import {
  ActiveBoardContext,
  type ActiveBoardContextValue,
} from '@/contexts/activeBoardContext';

export type { ActiveBoardContextValue };

export { ActiveBoardProvider } from '@/contexts/ActiveBoardProvider';

export function useActiveBoard(): ActiveBoardContextValue {
  const ctx = useContext(ActiveBoardContext);
  if (!ctx) {
    throw new Error('useActiveBoard must be used within ActiveBoardProvider');
  }
  return ctx;
}
