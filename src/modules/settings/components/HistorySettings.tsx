import { useState } from "react";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import * as Select from "@/components/Select";
import { useDeleteHistoryTransactionsMutation } from "@/modules/history/hooks/useHistory";
import type { HistoryDeleteRange } from "@/modules/history/types";

const DELETE_RANGE_LABEL: Record<HistoryDeleteRange, string> = {
  all: "All time",
  today: "Today",
  last7Days: "Last 7 days",
  last30Days: "Last 30 days",
};

function getDeleteConfirmationMessage(dateRange: HistoryDeleteRange): string {
  if (dateRange === "all") {
    return "Delete all recorded history? This action cannot be undone.";
  }
  return `Delete history for ${DELETE_RANGE_LABEL[dateRange].toLowerCase()}? This action cannot be undone.`;
}

export function HistorySettings() {
  const [dateRange, setDateRange] = useState<HistoryDeleteRange>("last30Days");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteMutation = useDeleteHistoryTransactionsMutation();

  const handleDelete = () => {
    setConfirmDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(dateRange);
  };

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            History retention
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Remove older transaction records to keep your history concise.
          </p>
        </section>

        <section className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          <label
            htmlFor="history-delete-range"
            className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
          >
            Delete range
          </label>
          <Select.Root
            value={dateRange}
            onValueChange={(value) => setDateRange(value as HistoryDeleteRange)}
          >
            <Select.Trigger
              id="history-delete-range"
              className="inline-flex h-9 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-neutral-700 outline-none hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/60"
              aria-label="Delete history range"
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
                  {(
                    Object.keys(DELETE_RANGE_LABEL) as HistoryDeleteRange[]
                  ).map((range) => (
                    <Select.Item
                      key={range}
                      value={range}
                      className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-300 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>
                        {DELETE_RANGE_LABEL[range]}
                      </Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden />
            {deleteMutation.isPending ? "Deleting..." : "Delete history"}
          </button>
        </section>
      </div>

      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Delete history?"
        description={getDeleteConfirmationMessage(dateRange)}
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
