import { Link } from '@tanstack/react-router';
import { Columns3, LayoutList, PieChart } from 'lucide-react';
import type { BoardView } from '@/modules/workspace/types';

interface BoardViewSwitcherProps {
  readonly boardSlug: string;
  readonly activeView: BoardView;
}

const VIEWS: ReadonlyArray<{
  view: BoardView;
  label: string;
  icon: typeof PieChart;
}> = [
  { view: 'board', label: 'Board', icon: Columns3 },
  { view: 'list', label: 'List', icon: LayoutList },
  { view: 'summary', label: 'Summary', icon: PieChart },
];

export function BoardViewSwitcher({ boardSlug, activeView }: BoardViewSwitcherProps) {
  return (
    <nav
      aria-label="Board view"
      className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-0.5"
    >
      {VIEWS.map(({ view, label, icon: Icon }) => {
        const isActive = view === activeView;
        return (
          <Link
            key={view}
            to="/$boardSlug/$view"
            params={{ boardSlug, view }}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
            ].join(' ')}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
