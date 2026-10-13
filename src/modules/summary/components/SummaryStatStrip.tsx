import type { SummaryKpi } from '@/modules/summary/utils/computeBoardSummaryMetrics';

const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

function needsAttention(kpi: SummaryKpi): boolean {
  return kpi.id === 'dueSoon' && typeof kpi.value === 'number' && kpi.value > 0;
}

function valueClassName(kpi: SummaryKpi): string {
  if (typeof kpi.value === 'string') {
    return 'truncate text-base font-semibold leading-6 text-neutral-900 dark:text-neutral-100';
  }
  const tone = needsAttention(kpi)
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-neutral-900 dark:text-neutral-100';
  return `text-2xl font-semibold leading-6 tabular-nums ${tone}`;
}

function StatCell({ kpi }: { readonly kpi: SummaryKpi }) {
  const isText = typeof kpi.value === 'string';

  return (
    <div className="min-w-0 bg-white dark:bg-neutral-900 px-4 py-3">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{kpi.label}</div>
      <div className={`mt-1.5 ${valueClassName(kpi)}`} title={isText ? String(kpi.value) : undefined}>
        {kpi.value}
      </div>
      <div className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-500" title={kpi.hint}>
        {kpi.hint}
      </div>
    </div>
  );
}

export function SummaryStatStrip({ kpis }: { readonly kpis: readonly SummaryKpi[] }) {
  return (
    <div
      className={`grid gap-px overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-700 ${
        COLUMN_CLASS[kpis.length] ?? 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {kpis.map((kpi) => (
        <StatCell key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
