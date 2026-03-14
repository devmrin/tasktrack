import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Check, History } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import * as Select from '@/components/Select';
import type { TransactionRecord, TransactionTicketRef } from '@/db/database';
import { useHistoryTransactionsQuery } from '@/modules/history/hooks/useHistory';
import type { HistoryDateRange, HistoryGroupMode } from '@/modules/history/types';
import {
  formatTransactionMessage,
  formatTransactionTime,
  getJiraSyncTicketDetails,
  groupTransactionsByDate,
  groupTransactionsByTicket,
} from '@/modules/history/utils/groupTransactions';

const DATE_RANGE_LABEL: Record<HistoryDateRange, string> = {
  all: 'All time',
  today: 'Today',
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
};

const GROUP_MODE_LABEL: Record<HistoryGroupMode, string> = {
  date: 'Group by date',
  ticket: 'Group by ticket',
};
const EMPTY_TRANSACTIONS: readonly TransactionRecord[] = [];

function getTransactionTicketLabel(ticket: TransactionTicketRef): string {
  if (ticket.ticketKey) {
    return ticket.ticketKey;
  }
  if (ticket.ticketType === 'local') {
    return `Local-${ticket.ticketId.slice(0, 8)}`;
  }
  return ticket.ticketId.slice(0, 8);
}

function TicketBadge({
  ticketLabel,
}: {
  readonly ticketLabel?: string;
}) {
  if (!ticketLabel) {
    return null;
  }
  return (
    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
      {ticketLabel}
    </span>
  );
}

function JiraSyncBreakdownDetails({
  transaction,
}: {
  readonly transaction: TransactionRecord;
}) {
  const details = getJiraSyncTicketDetails(transaction);
  if (!details) {
    return (
      <div className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400">
        Detailed ticket list is only available for newer sync records.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-800/70">
      <TicketListSection label="Added" tickets={details.created} />
      <TicketListSection label="Modified" tickets={details.updated} />
      <TicketListSection label="Removed" tickets={details.removed} />
    </div>
  );
}

function JiraSyncCollapseBody({
  expanded,
  transaction,
}: {
  readonly expanded: boolean;
  readonly transaction: TransactionRecord;
}) {
  if (!expanded) {
    return null;
  }
  return <JiraSyncBreakdownDetails transaction={transaction} />;
}

function TicketListSection({
  label,
  tickets,
}: {
  readonly label: string;
  readonly tickets: readonly TransactionTicketRef[];
}) {
  if (tickets.length === 0) {
    return (
      <div className="mt-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">None</p>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <ul className="mt-1 space-y-1">
        {tickets.map((ticket) => (
          <li key={`${label}-${ticket.ticketId}`} className="flex items-start gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {getTransactionTicketLabel(ticket)}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {ticket.ticketTitle}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HistoryPage() {
  const [groupMode, setGroupMode] = useState<HistoryGroupMode>('date');
  const [dateRange, setDateRange] = useState<HistoryDateRange>('all');
  const [expandedJiraRows, setExpandedJiraRows] = useState<Set<string>>(new Set());
  const transactionsQuery = useHistoryTransactionsQuery(dateRange);
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;

  const dateGroups = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );
  const ticketGroups = useMemo(
    () => groupTransactionsByTicket(transactions),
    [transactions],
  );
  const toggleJiraRow = (transactionId: string) => {
    setExpandedJiraRows((current) => {
      const next = new Set(current);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  return (
    <div className="h-screen overflow-y-auto px-6 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 space-y-4">
          <Link
            to="/"
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            Back to board
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              <History className="size-5" aria-hidden />
              History
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Review ticket journeys and daily work summary.
            </p>
          </div>
        </div>

        <div className="mb-5 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 md:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Grouping
            </span>
            <Select.Root
              value={groupMode}
              onValueChange={(value) => setGroupMode(value as HistoryGroupMode)}
            >
              <Select.Trigger
                className="inline-flex h-9 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-neutral-700 outline-none hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/60"
                aria-label="History grouping mode"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown
                    className="size-3.5 text-neutral-500 dark:text-neutral-400"
                    aria-hidden
                  />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content position="popper" sideOffset={4} align="start">
                  <Select.Viewport className="p-1">
                    {(Object.keys(GROUP_MODE_LABEL) as HistoryGroupMode[]).map(
                      (mode) => (
                        <Select.Item
                          key={mode}
                          value={mode}
                          className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-300 dark:data-[highlighted]:bg-neutral-700"
                        >
                          <Select.ItemText>{GROUP_MODE_LABEL[mode]}</Select.ItemText>
                          <Select.ItemIndicator className="ml-auto">
                            <Check className="size-3.5" aria-hidden />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ),
                    )}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Date range
            </span>
            <Select.Root
              value={dateRange}
              onValueChange={(value) => setDateRange(value as HistoryDateRange)}
            >
              <Select.Trigger
                className="inline-flex h-9 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-neutral-700 outline-none hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/60"
                aria-label="History date range"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown
                    className="size-3.5 text-neutral-500 dark:text-neutral-400"
                    aria-hidden
                  />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content position="popper" sideOffset={4} align="start">
                  <Select.Viewport className="p-1">
                    {(Object.keys(DATE_RANGE_LABEL) as HistoryDateRange[]).map(
                      (range) => (
                        <Select.Item
                          key={range}
                          value={range}
                          className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-300 dark:data-[highlighted]:bg-neutral-700"
                        >
                          <Select.ItemText>{DATE_RANGE_LABEL[range]}</Select.ItemText>
                          <Select.ItemIndicator className="ml-auto">
                            <Check className="size-3.5" aria-hidden />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ),
                    )}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        {transactionsQuery.isLoading ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            Loading history...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            No history found for this range.
          </div>
        ) : groupMode === 'date' ? (
          <div className="space-y-4">
            {dateGroups.map((group) => (
              <section
                key={group.dayStart}
                className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              >
                <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                  <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {group.label}
                  </h2>
                </header>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {group.transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="px-4 py-3 text-sm"
                    >
                      {transaction.eventType === 'jira_sync_summary' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleJiraRow(transaction.id)}
                            className="flex w-full items-center justify-between gap-4 text-left"
                            aria-expanded={expandedJiraRows.has(transaction.id)}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ChevronRight
                                className={`size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500 ${expandedJiraRows.has(transaction.id) ? 'rotate-90' : ''
                                  }`}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <span className="truncate text-neutral-900 dark:text-neutral-100">
                                  {formatTransactionMessage(transaction)}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 tabular-nums text-xs text-neutral-400 dark:text-neutral-500">
                              {formatTransactionTime(transaction.createdAt)}
                            </span>
                          </button>
                          <JiraSyncCollapseBody
                            expanded={expandedJiraRows.has(transaction.id)}
                            transaction={transaction}
                          />
                        </>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <TicketBadge ticketLabel={transaction.ticketKey} />
                              <span className="truncate text-neutral-900 dark:text-neutral-100">
                                {formatTransactionMessage(transaction)}
                              </span>
                            </div>
                            {transaction.ticketTitle && (
                              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {transaction.ticketTitle}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 tabular-nums text-xs text-neutral-400 dark:text-neutral-500">
                            {formatTransactionTime(transaction.createdAt)}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {ticketGroups.map((group) => (
              <section
                key={group.ticketId}
                className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              >
                <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <TicketBadge ticketLabel={group.ticketLabel} />
                    {group.ticketTitle && (
                      <h2 className="truncate text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                        {group.ticketTitle}
                      </h2>
                    )}
                  </div>
                </header>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {group.transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-neutral-900 dark:text-neutral-100">
                        {formatTransactionMessage(transaction)}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-neutral-400 dark:text-neutral-500">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
