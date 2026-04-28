import { useMemo } from 'react';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useBoardsQuery } from '@/modules/boards/hooks/useBoardsQuery';
import { useBoardTerminology } from '@/modules/boards/hooks/useBoardTerminology';
import { MOD_KEY } from '@/modules/settings/constants/shortcuts.constants';

interface ShortcutEntry {
  readonly label: string;
  readonly keys: readonly string[];
}

interface ShortcutGroup {
  readonly heading: string;
  readonly shortcuts: readonly ShortcutEntry[];
}

function Kbd({ children }: { readonly children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsSettings() {
  const boardsQuery = useBoardsQuery();
  const { activeBoard } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);

  const groups = useMemo((): readonly ShortcutGroup[] => {
    const boards = boardsQuery.data ?? [];
    const anyJiraBoard = boards.some((b) => b.jiraEnabled);

    const actions: ShortcutEntry[] = [];
    if (anyJiraBoard) {
      actions.push(
        { label: 'Quick open JIRA', keys: [MOD_KEY, 'J'] },
        { label: 'Sync JIRA', keys: [MOD_KEY, 'Shift', 'J'] },
      );
    }
    actions.push({
      label: `New local ${terminology.item}`,
      keys: [MOD_KEY, 'Shift', 'C'],
    });

    return [
      {
        heading: 'General',
        shortcuts: [
          { label: 'Search', keys: [MOD_KEY, 'K'] },
          { label: 'Open Settings', keys: [MOD_KEY, '.'] },
          { label: 'Toggle sidebar', keys: [MOD_KEY, '\\'] },
          { label: 'Toggle theme', keys: [MOD_KEY, 'Shift', 'M'] },
        ],
      },
      {
        heading: 'Actions',
        shortcuts: actions,
      },
    ];
  }, [boardsQuery.data, terminology.item]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.heading}>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            {group.heading}
          </h3>
          <div className="space-y-0 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {group.shortcuts.map((shortcut, idx) => (
              <div
                key={shortcut.label}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx > 0
                    ? 'border-t border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {shortcut.label}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={`${shortcut.label}-${key}`} className="flex items-center gap-1">
                      {i > 0 && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">+</span>
                      )}
                      <Kbd>{key}</Kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
