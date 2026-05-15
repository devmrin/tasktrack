import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  SettingsDialogFooterContext,
  type SettingsDialogFooterContextValue,
} from '@/contexts/settings-dialog-footer-context';

export function SettingsDialogFooterLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [footer, setFooterState] = useState<ReactNode | null>(null);
  const setFooter = useCallback((node: ReactNode | null) => {
    setFooterState(node);
  }, []);

  const value = useMemo(
    (): SettingsDialogFooterContextValue => ({ setFooter }),
    [setFooter],
  );

  return (
    <SettingsDialogFooterContext.Provider value={value}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div
            className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-800/80"
            role="toolbar"
            aria-label="Section actions"
          >
            <div className="flex flex-wrap justify-end gap-2">{footer}</div>
          </div>
        ) : null}
      </div>
    </SettingsDialogFooterContext.Provider>
  );
}
