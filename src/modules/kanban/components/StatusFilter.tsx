import { ChevronDown, ListFilter, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Select from "@/components/Select";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import {
  collectStatusOptions,
  formatStatusFilterSummary,
  useAllTicketsQuery,
  type StatusFilterOperator,
} from "@/modules/tickets";

const OPERATOR_LABEL: Record<StatusFilterOperator, string> = {
  equals: "Status = (equals)",
  notEquals: "Status != (not equals)",
};

const LOZENGE_CLASS = {
  done: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  todo: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
} as const;

function statusLozengeTone(status: string): keyof typeof LOZENGE_CLASS {
  const value = status.toLowerCase();
  if (
    value.includes("done") ||
    value.includes("closed") ||
    value.includes("resolved") ||
    value.includes("complete")
  ) {
    return "done";
  }
  if (value.includes("block")) {
    return "blocked";
  }
  if (
    value.includes("progress") ||
    value.includes("review") ||
    value.includes("testing") ||
    value.includes("qa")
  ) {
    return "progress";
  }
  return "todo";
}

function isSelectContentTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-radix-select-content]"));
}

function StatusLozenge({ status }: { readonly status: string }) {
  return (
    <span
      className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-xs font-medium ${LOZENGE_CLASS[statusLozengeTone(status)]}`}
    >
      {status}
    </span>
  );
}

function StatusOperatorSelect({
  operator,
  onOperatorChange,
}: {
  readonly operator: StatusFilterOperator;
  readonly onOperatorChange: (operator: StatusFilterOperator) => void;
}) {
  return (
    <Select.Root
      value={operator}
      onValueChange={(value) => {
        if (value === "equals" || value === "notEquals") {
          onOperatorChange(value);
        }
      }}
    >
      <Select.Trigger
        className="inline-flex h-9 w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-2.5 text-xs text-neutral-800 outline-none hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700/60 dark:focus:ring-neutral-500"
        aria-label="Status operator"
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="size-3.5 text-neutral-500" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} align="start" className="w-[var(--radix-select-trigger-width)]">
          <Select.Viewport>
            <Select.Item
              value="equals"
              className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-200 dark:data-[highlighted]:bg-neutral-700"
            >
              <Select.ItemText>{OPERATOR_LABEL.equals}</Select.ItemText>
            </Select.Item>
            <Select.Item
              value="notEquals"
              className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-200 dark:data-[highlighted]:bg-neutral-700"
            >
              <Select.ItemText>{OPERATOR_LABEL.notEquals}</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function StatusFilter() {
  const { activeBoard, activeBoardId } = useActiveBoard();
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const { filter, isActive, setOperator, toggleStatus, clearStatuses } = useStatusFilter();
  const [query, setQuery] = useState("");
  const statuses = useMemo(
    () => collectStatusOptions(ticketsQuery.data ?? [], filter.statuses),
    [ticketsQuery.data, filter.statuses],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleStatuses = useMemo(
    () => statuses.filter((status) => status.toLowerCase().includes(normalizedQuery)),
    [statuses, normalizedQuery],
  );
  const showFilter = (activeBoard?.jiraEnabled ?? false) || statuses.length > 0 || isActive;

  if (!showFilter) {
    return null;
  }

  const selected = new Set(filter.statuses);
  const emptyLabel = statuses.length === 0 ? "No statuses yet" : "No statuses found";
  const summary = formatStatusFilterSummary(filter);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Popover.Root
        onOpenChange={(open) => {
          if (!open) {
            setQuery("");
          }
        }}
      >
        <Popover.Trigger
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-neutral-800 outline-none hover:bg-neutral-50 data-[state=open]:border-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-blue-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700/60 ${
            isActive
              ? "border-blue-600"
              : "border-neutral-200 dark:border-neutral-700"
          }`}
          aria-label={isActive ? `Filter, ${filter.statuses.length} selected` : "Filter"}
          title={isActive ? summary : "Filter"}
        >
          <ListFilter className="size-3.5 shrink-0 text-neutral-500" aria-hidden />
          <span>Filter</span>
          {isActive && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {filter.statuses.length}
            </span>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className="z-[60] w-72 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
            onInteractOutside={(event) => {
              if (isSelectContentTarget(event.target)) {
                event.preventDefault();
              }
            }}
            onFocusOutside={(event) => {
              if (isSelectContentTarget(event.target)) {
                event.preventDefault();
              }
            }}
          >
            <div className="space-y-2">
              <p className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Status
              </p>
              <StatusOperatorSelect operator={filter.operator} onOperatorChange={setOperator} />
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Status"
                  aria-label="Search Status"
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white pl-8 pr-2 text-xs text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-500"
                />
              </div>
              <div className="max-h-52 overflow-y-auto" role="group" aria-label="Statuses">
                {visibleStatuses.length === 0 ? (
                  <p className="px-1 py-3 text-xs text-neutral-500 dark:text-neutral-400">{emptyLabel}</p>
                ) : (
                  visibleStatuses.map((status) => (
                    <label
                      key={status}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(status)}
                        onChange={() => toggleStatus(status)}
                        className="size-3.5 shrink-0 accent-neutral-900 dark:accent-neutral-100"
                      />
                      <StatusLozenge status={status} />
                    </label>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={clearStatuses}
                  disabled={!isActive}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  Clear all
                </button>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {`${visibleStatuses.length} of ${statuses.length}`}
                </span>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {isActive && (
        <button
          type="button"
          onClick={clearStatuses}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          aria-label="Clear filter"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
