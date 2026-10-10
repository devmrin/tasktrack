import { useDroppable } from '@dnd-kit/core';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  History,
  Inbox,
  Info,
  Moon,
  Search,
  Settings2,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from '@/components/Tooltip';
import { useTheme } from '@/hooks/useTheme';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useBoardTerminology } from '@/modules/boards/hooks/useBoardTerminology';
import { useInboxTicketsQuery } from '@/modules/inbox/hooks/useInboxTicketsQuery';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import {
  GettingStartedDialog,
  SHORTCUT_DISPLAY,
  type SectionId,
} from '@/modules/settings';

const RAIL_WIDTH = 48;

function getNextTheme(current: 'light' | 'dark'): 'light' | 'dark' {
  return current === 'light' ? 'dark' : 'light';
}

export interface AppRailProps {
  readonly isInboxOpen: boolean;
  readonly onInboxToggle: () => void;
  readonly onSearchOpen: () => void;
  readonly onSettingsOpen: (section?: SectionId) => void;
}

export function AppRail({
  isInboxOpen,
  onInboxToggle,
  onSearchOpen,
  onSettingsOpen,
}: AppRailProps) {
  const { theme, setTheme } = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHistoryRoute = pathname === '/history';
  const { activeBoard, activeBoardId } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const inboxQuery = useInboxTicketsQuery(activeBoardId);
  const inboxCount = inboxQuery.data?.length ?? 0;
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);

  const dropEnabled = !isInboxOpen && !isHistoryRoute;
  const { setNodeRef: setInboxDropRef, isOver } = useDroppable({
    id: INBOX_COLUMN_ID,
    disabled: !dropEnabled,
  });

  const inboxActive = isInboxOpen && !isHistoryRoute;
  const railButtonClass =
    'flex items-center justify-center p-2 rounded-md transition-colors';
  const idleButtonClass =
    'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200';
  const activeButtonClass =
    'bg-[#FDFC74] text-black hover:opacity-90';

  return (
    <>
      <nav
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
        style={{ width: RAIL_WIDTH }}
        aria-label="App navigation"
      >
        <div className="flex flex-col items-center gap-1 pt-3 shrink-0">
          <Tooltip content={`Search (${SHORTCUT_DISPLAY.search})`} side="right">
            <button
              type="button"
              onClick={onSearchOpen}
              className={`${railButtonClass} ${idleButtonClass}`}
              aria-label={`Search ${terminology.items}`}
            >
              <Search className="size-5" aria-hidden />
            </button>
          </Tooltip>

          <Tooltip
            content={
              dropEnabled && isOver
                ? 'Drop to move to inbox'
                : `Inbox (${inboxCount}) (${SHORTCUT_DISPLAY.toggleSidebar})`
            }
            side="right"
          >
            <button
              type="button"
              ref={setInboxDropRef}
              onClick={onInboxToggle}
              className={`${railButtonClass} ${
                inboxActive
                  ? activeButtonClass
                  : dropEnabled && isOver
                    ? 'bg-[#FDFC74]/40 text-black dark:text-[#FDFC74]'
                    : idleButtonClass
              }`}
              aria-label={
                inboxActive ? 'Close inbox' : `Open inbox (${inboxCount})`
              }
              aria-pressed={inboxActive}
            >
              <Inbox className="size-5" aria-hidden />
            </button>
          </Tooltip>

          <Tooltip
            content={`History (${SHORTCUT_DISPLAY.openHistory})`}
            side="right"
          >
            <Link
              to="/history"
              className={`${railButtonClass} ${
                isHistoryRoute ? activeButtonClass : idleButtonClass
              }`}
              aria-label="Open history page"
              aria-current={isHistoryRoute ? 'page' : undefined}
            >
              <History className="size-5" aria-hidden />
            </Link>
          </Tooltip>
        </div>

        <div className="flex-1 min-h-0" />

        <div className="shrink-0 border-t border-neutral-100 p-2 flex flex-col items-center gap-1 dark:border-neutral-800">
          <Tooltip
            content={`Settings (${SHORTCUT_DISPLAY.settings})`}
            side="right"
          >
            <button
              type="button"
              onClick={() => onSettingsOpen()}
              className={`${railButtonClass} ${idleButtonClass}`}
              aria-label="Settings"
            >
              <Settings2 className="size-5" aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Getting started" side="right">
            <button
              type="button"
              onClick={() => setGettingStartedOpen(true)}
              className={`${railButtonClass} ${idleButtonClass}`}
              aria-label="Open getting started"
            >
              <Info className="size-5" aria-hidden />
            </button>
          </Tooltip>
          <Tooltip
            content={`Toggle theme (${SHORTCUT_DISPLAY.toggleTheme})`}
            side="right"
          >
            <button
              type="button"
              onClick={() => setTheme(getNextTheme(theme))}
              className={`${railButtonClass} ${idleButtonClass}`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun className="size-5" aria-hidden />
              ) : (
                <Moon className="size-5" aria-hidden />
              )}
            </button>
          </Tooltip>
        </div>
      </nav>
      <GettingStartedDialog
        open={gettingStartedOpen}
        onOpenChange={setGettingStartedOpen}
      />
    </>
  );
}
