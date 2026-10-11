import { Tooltip } from '@/components/Tooltip';

interface FocusCustomCardProps {
  readonly label: string;
  readonly onDismiss: () => void;
}

export function FocusCustomCard({ label, onDismiss }: FocusCustomCardProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-6">
              {label}
            </h3>
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              One-off focus task
            </p>
          </div>
          <Tooltip content="End focus session">
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              End
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
