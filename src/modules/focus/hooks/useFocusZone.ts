import { useContext } from 'react';
import { FocusZoneContext } from '@/modules/focus/contexts/focus-zone-context';

export function useFocusZone() {
  const ctx = useContext(FocusZoneContext);
  if (!ctx) {
    throw new Error('useFocusZone must be used within a FocusZoneProvider');
  }
  return ctx;
}
