import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ExternalLink, X } from 'lucide-react';
import { useAtlassianConfigQuery } from '@/modules/settings/hooks/useAtlassianQuery';
import { isValidTicketKey } from '@/modules/tickets/utils/validateTicketKey';
import { useToast } from '@/hooks/useToast';

interface JiraQuickOpenDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function JiraQuickOpenDialog({ open, onOpenChange }: JiraQuickOpenDialogProps) {
  const [issueKey, setIssueKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const configQuery = useAtlassianConfigQuery();
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setIssueKey('');
    }
    onOpenChange(nextOpen);
  }

  function openInJira() {
    const raw = issueKey.trim().toUpperCase();
    if (!raw) return;

    const instanceUrl = configQuery.data?.instanceUrl?.trim();
    if (!instanceUrl) {
      showToast('JIRA instance URL is not configured');
      return;
    }

    if (!isValidTicketKey(raw)) {
      showToast('Enter a valid issue key (e.g. TR-1234)');
      return;
    }

    const url = `${instanceUrl.replace(/\/+$/, '')}/browse/${encodeURIComponent(raw)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    handleOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-[101] -translate-x-1/2 w-[90vw] max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col overflow-hidden focus:outline-none">
          <Dialog.Title className="sr-only">Quick open JIRA issue</Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter a JIRA issue key to open it in your browser
          </Dialog.Description>

          <div className="flex items-center gap-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
            <ExternalLink
              className="size-4 text-neutral-400 dark:text-neutral-500 shrink-0"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="text"
              value={issueKey}
              onChange={(e) => setIssueKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  openInJira();
                }
              }}
              placeholder="Issue key (e.g. TR-1234)"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 py-3 text-sm bg-transparent text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
            />
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors"
                aria-label="Close"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-400 dark:text-neutral-500">
            <span>Opens in a new browser tab</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px]">
                Enter
              </kbd>
              Open
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
