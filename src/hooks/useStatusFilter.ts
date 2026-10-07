import { useContext } from 'react';
import { StatusFilterContext } from '@/contexts/status-filter-context';
import type { StatusFilterContextValue } from '@/contexts/status-filter-context';

export function useStatusFilter(): StatusFilterContextValue {
  const value = useContext(StatusFilterContext);
  if (!value) {
    throw new Error('useStatusFilter must be used within a StatusFilterProvider');
  }
  return value;
}
