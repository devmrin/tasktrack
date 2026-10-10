import {
  Calendar,
  CheckCircle2,
  FilePlus2,
  Focus,
  Pencil,
  Target,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRelativeTimeAgo } from '@/utils/formatRelativeTimeAgo';
import { useBoardSummaryMetrics } from '@/modules/summary/hooks/useBoardSummaryMetrics';
import type { NamedCount, SummaryKpi } from '@/modules/summary/utils/computeBoardSummaryMetrics';

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#64748b',
  '#06b6d4',
  '#ec4899',
];

function KpiTileIcon({ id }: { readonly id: string }) {
  switch (id) {
    case 'completed':
      return <CheckCircle2 className="size-4" aria-hidden />;
    case 'updated':
      return <Pencil className="size-4" aria-hidden />;
    case 'created':
      return <FilePlus2 className="size-4" aria-hidden />;
    case 'dueSoon':
      return <Calendar className="size-4" aria-hidden />;
    case 'focusNow':
      return <Focus className="size-4" aria-hidden />;
    case 'readyToFocus':
      return <Target className="size-4" aria-hidden />;
    default:
      return <CheckCircle2 className="size-4" aria-hidden />;
  }
}

function KpiTile({ kpi }: { readonly kpi: SummaryKpi }) {
  const isTextValue = typeof kpi.value === 'string';

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 min-h-[5.5rem]">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <KpiTileIcon id={kpi.id} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={
              isTextValue
                ? 'text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate'
                : 'text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100'
            }
            title={isTextValue ? String(kpi.value) : undefined}
          >
            {kpi.value}
          </div>
          <div className="mt-0.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {kpi.label}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{kpi.hint}</div>
        </div>
      </div>
    </div>
  );
}

function StatusDonut({
  data,
  total,
}: {
  readonly data: readonly NamedCount[];
  readonly total: number;
}) {
  const chartData = data.map((d) => ({ name: d.name, value: d.count }));

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Status overview
      </h3>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {total} total work items
      </p>
      <div className="mt-3 flex flex-1 items-center gap-4 min-h-[10rem]">
        {total === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No items yet.</p>
        ) : (
          <>
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
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
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {data.map((item, index) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="truncate text-neutral-700 dark:text-neutral-300">
                      {item.name}
                    </span>
                  </span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function PriorityBars({ data }: { readonly data: readonly NamedCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 h-full">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Priority breakdown
      </h3>
      <div className="mt-4 space-y-2.5">
        {data.map((item) => (
          <div key={item.name} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2">
            <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
              {item.name}
            </span>
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-[width]"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-right text-neutral-500 dark:text-neutral-400">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkTypes({
  data,
  total,
}: {
  readonly data: readonly NamedCount[];
  readonly total: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 h-full">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Work on board
      </h3>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {total} total items
      </p>
      <div className="mt-4 space-y-3">
        {data.map((item) => {
          const pct = total === 0 ? 0 : Math.round((item.count / total) * 100);
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-neutral-700 dark:text-neutral-300">{item.name}</span>
                <span className="text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {item.count} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BoardSummaryView() {
  const { metrics, recentActivity, loading } = useBoardSummaryMetrics();

  if (loading || !metrics) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-600 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-6 pb-6 space-y-4">
      <div
        className={`grid gap-3 ${
          metrics.kpis.length > 4
            ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {metrics.kpis.map((kpi) => (
          <KpiTile key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <StatusDonut data={metrics.statusOverview} total={metrics.totalItems} />

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 h-full">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Recent activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              No recent activity for this board.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentActivity.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="text-neutral-800 dark:text-neutral-200">{item.message}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatRelativeTimeAgo(new Date(item.createdAt).toISOString())}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <PriorityBars data={metrics.priorityBreakdown} />
        <WorkTypes data={metrics.workTypes} total={metrics.totalItems} />
      </div>
    </div>
  );
}
