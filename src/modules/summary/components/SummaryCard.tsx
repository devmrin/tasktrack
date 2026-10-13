import type { ReactNode } from 'react';

interface SummaryCardProps {
  readonly title: string;
  readonly meta?: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

export function SummaryCard({
  title,
  meta,
  className = '',
  bodyClassName = '',
  children,
}: SummaryCardProps) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {meta ? (
          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {meta}
          </span>
        ) : null}
      </header>
      <div className={`flex min-h-0 flex-1 flex-col px-4 pb-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
