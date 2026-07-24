import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';

interface BoardDeleteConfirmationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly boardName: string | null;
  readonly ticketCount: number;
  readonly itemLabel: 'tickets' | 'tasks';
  readonly loading?: boolean;
  readonly onConfirm: () => void;
}

export function BoardDeleteConfirmationDialog({
  open,
  onOpenChange,
  boardName,
  ticketCount,
  itemLabel,
  loading = false,
  onConfirm,
}: BoardDeleteConfirmationDialogProps) {
  const confirmationValue = boardName ?? '';
  const [typedName, setTypedName] = useState('');

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setTypedName('');
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-red-200 bg-white p-5 shadow-2xl focus:outline-none dark:border-red-900/60 dark:bg-neutral-900">
          <AlertDialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Delete “{boardName}”?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
            This permanently deletes the board, its columns, and{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {ticketCount} {itemLabel}
            </span>{' '}
            on it. This cannot be undone.
          </AlertDialog.Description>
          <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Type <span className="font-semibold">{confirmationValue}</span> to confirm
            <input
              aria-label="Board name confirmation"
              autoFocus
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              disabled={loading}
              onChange={(event) => setTypedName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && typedName === confirmationValue) {
                  onConfirm();
                }
              }}
              placeholder={confirmationValue}
              type="text"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                disabled={loading || typedName !== confirmationValue}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                onClick={onConfirm}
              >
                {loading ? 'Deleting…' : 'Delete board'}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
