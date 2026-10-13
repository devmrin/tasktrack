import { PriorityBreakdownCard } from '@/modules/summary/components/PriorityBreakdownCard';
import { RecentActivityCard } from '@/modules/summary/components/RecentActivityCard';
import { StatusOverviewCard } from '@/modules/summary/components/StatusOverviewCard';
import { SummaryStatStrip } from '@/modules/summary/components/SummaryStatStrip';
import { useBoardSummaryMetrics } from '@/modules/summary/hooks/useBoardSummaryMetrics';

const FOCUS_KPI_IDS = new Set(['focusNow', 'readyToFocus']);
const TWO_COLUMN_GRID = 'grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]';

export function BoardSummaryView() {
  const { metrics, recentActivity, loading } = useBoardSummaryMetrics();

  if (loading || !metrics) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-600 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  const activityKpis = metrics.kpis.filter((kpi) => !FOCUS_KPI_IDS.has(kpi.id));
  const focusKpis = metrics.kpis.filter((kpi) => FOCUS_KPI_IDS.has(kpi.id));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-6 pb-6">
      <div className="flex w-full flex-col gap-3">
        <div className={focusKpis.length > 0 ? TWO_COLUMN_GRID : undefined}>
          <SummaryStatStrip kpis={activityKpis} />
          {focusKpis.length > 0 && <SummaryStatStrip kpis={focusKpis} />}
        </div>

        <div className={TWO_COLUMN_GRID}>
          <div className="flex min-w-0 flex-col gap-3">
            <StatusOverviewCard
              statuses={metrics.statusOverview}
              sources={metrics.workTypes}
              total={metrics.totalItems}
            />
            <PriorityBreakdownCard data={metrics.priorityBreakdown} total={metrics.totalItems} />
          </div>
          <RecentActivityCard items={recentActivity} />
        </div>
      </div>
    </div>
  );
}
