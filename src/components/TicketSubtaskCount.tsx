import { ListTree } from 'lucide-react';

interface TicketSubtaskCountProps {
  readonly count: number;
}

export function TicketSubtaskCount({ count }: TicketSubtaskCountProps) {
  if (count <= 0) {
    return null;
  }
  const label = count === 1 ? 'subtask' : 'subtasks';
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"
      title={`${count} ${label}`}
    >
      <ListTree className="size-3.5" aria-hidden />
      <span>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
