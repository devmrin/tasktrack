import { createContext, useContext, type ReactNode } from 'react';

export interface SettingsDialogFooterContextValue {
  readonly setFooter: (node: ReactNode | null) => void;
}

export const SettingsDialogFooterContext = createContext<SettingsDialogFooterContextValue | null>(
  null,
);

export function useSettingsDialogFooter(): SettingsDialogFooterContextValue {
  const ctx = useContext(SettingsDialogFooterContext);
  if (!ctx) {
    throw new Error(
      'useSettingsDialogFooter must be used within SettingsDialogFooterLayout',
    );
  }
  return ctx;
}
