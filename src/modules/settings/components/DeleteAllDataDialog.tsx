import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { DELETE_ALL_APP_DATA_PHRASE } from '@/modules/settings/constants/app.constants';

interface DeleteAllDataDialogProps {
  readonly open: boolean;
  readonly deleting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}

export function DeleteAllDataDialog({
  open,
  deleting,
  onOpenChange,
  onConfirm,
}: DeleteAllDataDialogProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const canConfirm = typedPhrase === DELETE_ALL_APP_DATA_PHRASE && !deleting;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (deleting) return;
        if (!nextOpen) setTypedPhrase('');
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[111] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-red-200 bg-white p-5 shadow-2xl focus:outline-none dark:border-red-900/60 dark:bg-neutral-900">
          <AlertDialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Delete all application data?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
            This permanently deletes every board, ticket, column, history record, focus
            setting, and connected account stored in this browser. tasktrack will restart
            as a new install. This cannot be undone.
          </AlertDialog.Description>
          <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            To confirm, type{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {DELETE_ALL_APP_DATA_PHRASE}
            </span>{' '}
            below.
            <input
              aria-label="Type delete all data to confirm"
              autoComplete="off"
              autoFocus
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              disabled={deleting}
              spellCheck={false}
              type="text"
              value={typedPhrase}
              onChange={(event) => setTypedPhrase(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canConfirm) {
                  onConfirm();
                }
              }}
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={deleting}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={!canConfirm}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              onClick={onConfirm}
            >
              {deleting ? 'Deleting…' : 'Delete all data'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
