import { createContext } from 'react';
import type { StatusFilter, StatusFilterOperator } from '@/modules/tickets/utils/statusFilter';

export interface StatusFilterContextValue {
  readonly filter: StatusFilter;
  readonly isActive: boolean;
  readonly setOperator: (operator: StatusFilterOperator) => void;
  readonly toggleStatus: (status: string) => void;
  readonly clearStatuses: () => void;
}

export const StatusFilterContext = createContext<StatusFilterContextValue | null>(null);
