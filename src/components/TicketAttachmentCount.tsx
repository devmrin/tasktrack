import { Paperclip } from 'lucide-react';

interface TicketAttachmentCountProps {
  readonly count: number;
}

export function TicketAttachmentCount({ count }: TicketAttachmentCountProps) {
  if (count <= 0) {
    return null;
  }
  const label = count === 1 ? 'attachment' : 'attachments';
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"
      title={`${count} ${label}`}
    >
      <Paperclip className="size-3.5" aria-hidden />
      <span>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
