import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { APP_VERSION } from '@/modules/settings/constants/app.constants';
import { DeleteAllDataDialog } from '@/modules/settings/components/DeleteAllDataDialog';
import { deleteAllAppData } from '@/modules/settings/services/reset-app.service';

export function ApplicationSettings() {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteAllAppData();
      globalThis.location.reload();
    } catch {
      setDeleting(false);
      showToast('Could not delete application data');
    }
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <h3 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Version
          </h3>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            The version of tasktrack installed in this browser.
          </p>
          <p className="font-mono text-sm text-neutral-800 dark:text-neutral-200">{APP_VERSION}</p>
        </section>

        <section className="overflow-hidden rounded-lg border border-red-300 dark:border-red-900/80">
          <div className="border-b border-red-200 px-4 py-3 dark:border-red-900/80">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h3>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Delete all application data
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Permanently remove boards, tickets, history, focus settings, and connected
                accounts from this browser. tasktrack will start over as a new install.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
              onClick={() => setConfirmOpen(true)}
            >
              Delete all data
            </button>
          </div>
        </section>
      </div>

      <DeleteAllDataDialog
        open={confirmOpen}
        deleting={deleting}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </>
  );
}
