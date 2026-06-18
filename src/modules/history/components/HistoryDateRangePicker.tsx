import { useState } from "react";
import { CalendarDays } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import {
  DayPicker,
  type DateRange as DayPickerDateRange,
} from "react-day-picker";
import "react-day-picker/style.css";
import type {
  HistoryDateRange,
  HistoryDateRangePreset,
} from "@/modules/history/types";
import {
  ALL_TIME_HISTORY_DATE_RANGE,
  createHistoryDateRangeFromPreset,
} from "@/modules/history/services/history.service";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const PRESET_LABEL: Record<HistoryDateRangePreset, string> = {
  all: "All time",
  today: "Today",
  last7Days: "Last 7 days",
  last30Days: "Last 30 days",
  last90Days: "Last 90 days",
  last365Days: "Last year",
  last730Days: "Last 2 years",
};

const PRESET_ORDER: HistoryDateRangePreset[] = [
  "all",
  "today",
  "last7Days",
  "last30Days",
  "last90Days",
  "last365Days",
  "last730Days",
];

interface HistoryDateRangePickerProps {
  readonly value: HistoryDateRange;
  readonly onChange: (value: HistoryDateRange) => void;
}

function isSameDay(left: number, right: number): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function formatRangeLabel(value: HistoryDateRange): string {
  if (value.from === null && value.to === null) {
    return "All time";
  }
  if (value.from !== null && value.to !== null) {
    if (isSameDay(value.from, value.to)) {
      return DATE_FORMATTER.format(value.from);
    }
    return `${DATE_FORMATTER.format(value.from)} - ${DATE_FORMATTER.format(value.to)}`;
  }
  if (value.from !== null) {
    return `From ${DATE_FORMATTER.format(value.from)}`;
  }
  if (value.to !== null) {
    return `Until ${DATE_FORMATTER.format(value.to)}`;
  }
  return "All time";
}

function toDayPickerRange(
  value: HistoryDateRange,
): DayPickerDateRange | undefined {
  if (value.from === null && value.to === null) {
    return undefined;
  }
  return {
    from: value.from === null ? undefined : new Date(value.from),
    to: value.to === null ? undefined : new Date(value.to),
  };
}

export function HistoryDateRangePicker({
  value,
  onChange,
}: HistoryDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedRange = toDayPickerRange(value);

  const handlePresetSelect = (preset: HistoryDateRangePreset) => {
    onChange(createHistoryDateRangeFromPreset(preset));
    setOpen(false);
  };

  const handleRangeSelect = (range: DayPickerDateRange | undefined) => {
    if (!range?.from) {
      onChange(ALL_TIME_HISTORY_DATE_RANGE);
      return;
    }

    onChange({
      from: range.from.getTime(),
      to: (range.to ?? range.from).getTime(),
    });

    if (range.to) {
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-2.5 text-left text-sm text-neutral-700 outline-none transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/60"
          aria-label="History date range"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <CalendarDays
              className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
              aria-hidden
            />
            <span className="truncate">{formatRangeLabel(value)}</span>
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Custom
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[60] w-[min(44rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl outline-none dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="space-y-3 history-date-picker">
            <div className="flex flex-wrap gap-2">
              {PRESET_ORDER.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                >
                  {PRESET_LABEL[preset]}
                </button>
              ))}
            </div>

            <DayPicker
              animate
              mode="range"
              numberOfMonths={2}
              pagedNavigation
              defaultMonth={selectedRange?.from ?? new Date()}
              disabled={{ after: new Date() }}
              selected={selectedRange}
              onSelect={handleRangeSelect}
            />

            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <span>Pick any custom range or jump with a preset.</span>
              <button
                type="button"
                onClick={() => {
                  onChange(ALL_TIME_HISTORY_DATE_RANGE);
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                Clear
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
