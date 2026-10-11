import { createContext } from 'react';
import type { FocusZoneValue } from '@/modules/focus/hooks/useFocusZoneState';

export const FocusZoneContext = createContext<FocusZoneValue | null>(null);
