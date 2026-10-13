import { SummaryCard } from '@/modules/summary/components/SummaryCard';
import type { NamedCount } from '@/modules/summary/utils/computeBoardSummaryMetrics';

const PRIORITY_BAR_CLASS: Record<string, string> = {
  Highest: 'bg-red-500 dark:bg-red-400',
  High: 'bg-orange-500 dark:bg-orange-400',
  Medium: 'bg-amber-500 dark:bg-amber-400',
  Low: 'bg-sky-500 dark:bg-sky-400',
  Lowest: 'bg-slate-400 dark:bg-slate-500',
  None: 'bg-neutral-300 dark:bg-neutral-600',
};

export function PriorityBreakdownCard({
  data,
  total,
}: {
  readonly data: readonly NamedCount[];
  readonly total: number;
}) {
  const prioritized = data
    .filter((item) => item.name !== 'None')
    .reduce((sum, item) => sum + item.count, 0);

  return (
    <SummaryCard title="Priority" meta={`${prioritized} of ${total} prioritized`}>
      <ul className="space-y-2.5">
        {data.map((item) => {
          const isEmpty = item.count === 0;
          const width = total === 0 ? 0 : (item.count / total) * 100;
          return (
            <li
              key={item.name}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-xs"
            >
              <span
                className={
                  isEmpty
                    ? 'text-neutral-400 dark:text-neutral-600'
                    : 'text-neutral-700 dark:text-neutral-300'
                }
              >
                {item.name}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <span
                  className={`block h-full rounded-full ${PRIORITY_BAR_CLASS[item.name] ?? 'bg-neutral-400'}`}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span
                className={`text-right tabular-nums ${
                  isEmpty
                    ? 'text-neutral-400 dark:text-neutral-600'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>
    </SummaryCard>
  );
}
