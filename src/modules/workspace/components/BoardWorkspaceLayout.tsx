import type { ReactNode } from 'react';
import { BoardSwitcher } from '@/modules/boards';
import { BoardViewSwitcher } from '@/modules/workspace/components/BoardViewSwitcher';
import type { BoardView } from '@/modules/workspace/types';

interface BoardWorkspaceLayoutProps {
  readonly boardSlug: string;
  readonly view: BoardView;
  readonly toolbarEnd?: ReactNode;
  readonly children: ReactNode;
}

export function BoardWorkspaceLayout({
  boardSlug,
  view,
  toolbarEnd,
  children,
}: BoardWorkspaceLayoutProps) {
  return (
    <div className="h-screen bg-neutral-100 dark:bg-neutral-900 flex flex-col">
      <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-2 flex items-center gap-2 sm:gap-4 min-h-12 flex-wrap sm:flex-nowrap">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <BoardSwitcher />
        </div>
        <div className="order-3 sm:order-none w-full sm:w-auto flex justify-center shrink-0">
          <BoardViewSwitcher boardSlug={boardSlug} activeView={view} />
        </div>
        <div className="min-w-0 flex-1 flex items-center justify-end gap-2">
          {toolbarEnd}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
