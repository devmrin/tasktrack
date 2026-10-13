import { SummaryCard } from '@/modules/summary/components/SummaryCard';
import type { SummaryActivityItem } from '@/modules/summary/hooks/useBoardSummaryMetrics';
import { formatRelativeTimeAgo } from '@/utils/formatRelativeTimeAgo';

function ActivityRow({ item }: { readonly item: SummaryActivityItem }) {
  return (
    <li className="group relative flex gap-3 pb-3.5 last:pb-0">
      <span
        className="absolute left-[3px] top-4 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800 group-last:hidden"
        aria-hidden
      />
      <span
        className="mt-1.5 size-[7px] shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <p className="truncate text-sm text-neutral-800 dark:text-neutral-200" title={item.message}>
          {item.message}
        </p>
        <time
          className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
          dateTime={new Date(item.createdAt).toISOString()}
        >
          {formatRelativeTimeAgo(new Date(item.createdAt).toISOString())}
        </time>
      </div>
    </li>
  );
}

export function RecentActivityCard({ items }: { readonly items: readonly SummaryActivityItem[] }) {
  return (
    <SummaryCard title="Recent activity" className="lg:h-full" bodyClassName="relative min-h-[12rem]">
      {items.length === 0 ? (
        <p className="m-auto text-sm text-neutral-500 dark:text-neutral-400">
          No recent activity for this board.
        </p>
      ) : (
        <ul className="overflow-y-auto lg:absolute lg:inset-x-4 lg:top-0 lg:bottom-4">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}
