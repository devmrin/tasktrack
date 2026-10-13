import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { SummaryCard } from '@/modules/summary/components/SummaryCard';
import type { NamedCount } from '@/modules/summary/utils/computeBoardSummaryMetrics';

const STATUS_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#64748b',
  '#06b6d4',
  '#ec4899',
];

const SOURCE_COLORS: Record<string, string> = {
  Jira: 'bg-sky-500 dark:bg-sky-400',
  Local: 'bg-violet-500 dark:bg-violet-400',
};

function percentOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function statusColor(index: number): string {
  return STATUS_COLORS[index % STATUS_COLORS.length];
}

function StatusDonut({ data, total }: { readonly data: readonly NamedCount[]; readonly total: number }) {
  const chartData = data.map((d) => ({ name: d.name, value: d.count }));

  return (
    <div className="relative size-32 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={46}
            outerRadius={62}
            paddingAngle={2}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={statusColor(index)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgb(64 64 64)',
              background: 'rgb(23 23 23)',
              color: 'rgb(245 245 245)',
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-100">
          {total}
        </span>
        <span className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">items</span>
      </div>
    </div>
  );
}

function StatusLegend({ data, total }: { readonly data: readonly NamedCount[]; readonly total: number }) {
  return (
    <ul className="grid min-w-0 flex-1 grid-cols-[fit-content(10rem)_minmax(0,1fr)_auto] gap-x-4 gap-y-2.5">
      {data.map((item, index) => {
        const pct = percentOf(item.count, total);
        return (
          <li
            key={item.name}
            className="col-span-3 grid grid-cols-subgrid items-center text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: statusColor(index) }}
              />
              <span className="truncate text-neutral-700 dark:text-neutral-300" title={item.name}>
                {item.name}
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <span
                className="block h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: statusColor(index) }}
              />
            </span>
            <span className="text-right tabular-nums">
              <span className="text-neutral-900 dark:text-neutral-100">{item.count}</span>
              <span className="ml-1.5 inline-block w-9 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                {pct}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SourceSplit({ data, total }: { readonly data: readonly NamedCount[]; readonly total: number }) {
  const visible = data.filter((item) => item.count > 0);

  return (
    <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-neutral-500 dark:text-neutral-400">Source</span>
        <span className="flex items-center gap-3">
          {data.map((item) => (
            <span key={item.name} className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span className={`size-2 rounded-full ${SOURCE_COLORS[item.name] ?? 'bg-neutral-400'}`} />
              {item.name}
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {item.count} · {percentOf(item.count, total)}%
              </span>
            </span>
          ))}
        </span>
      </div>
      <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {visible.map((item) => (
          <span
            key={item.name}
            className={`h-full ${SOURCE_COLORS[item.name] ?? 'bg-neutral-400'}`}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function StatusOverviewCard({
  statuses,
  sources,
  total,
}: {
  readonly statuses: readonly NamedCount[];
  readonly sources: readonly NamedCount[];
  readonly total: number;
}) {
  return (
    <SummaryCard title="Status overview">
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No items on this board yet.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <StatusDonut data={statuses} total={total} />
            <StatusLegend data={statuses} total={total} />
          </div>
          <SourceSplit data={sources} total={total} />
        </>
      )}
    </SummaryCard>
  );
}
