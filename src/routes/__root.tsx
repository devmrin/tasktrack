import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { queryKeys } from '@/hooks/queryKeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DndProvider } from '@/contexts/DndProvider';
import { SettingsContext } from '@/contexts/settings-context';
import { TicketDetailProvider } from '@/contexts/TicketDetailContext';
import { InboxSidebar, useJiraSyncMutation } from '@/modules/inbox';
import type { InboxSidebarHandle } from '@/modules/inbox';
import { TicketDetailSidebar } from '@/modules/kanban';
import { SearchDialog } from '@/modules/search';
import { SettingsDialog } from '@/modules/settings';
import type { SectionId } from '@/modules/settings';

function getNextTheme(current: 'light' | 'dark'): 'light' | 'dark' {
  return current === 'light' ? 'dark' : 'light';
}

export const Route = createRootRoute({
  component: RootComponent,
});

function hasOAuthCallback(): boolean {
  const params = new URLSearchParams(globalThis.location.search);
  return params.has('code');
}

function RootComponent() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const isMobileLayout = useMediaQuery('(max-width: 1023px)');
  const jiraSyncMutation = useJiraSyncMutation();
  const [isInboxOpen, setIsInboxOpen] = useLocalStorage<boolean>('inbox-sidebar-open', true);
  const oauthPending = hasOAuthCallback();
  const [isSettingsOpen, setIsSettingsOpen] = useState(oauthPending);
  const [settingsSection, setSettingsSection] = useState<SectionId | undefined>(
    oauthPending ? 'jira' : undefined,
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inboxRef = useRef<InboxSidebarHandle>(null);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHistoryRoute = pathname === '/history';

  const handleSearchOpen = useCallback(() => setIsSearchOpen(true), []);
  const handleSearchOpenChange = useCallback((open: boolean) => setIsSearchOpen(open), []);

  const shortcuts = useMemo(
    () => [
      { key: 'k', metaKey: true, handler: () => setIsSearchOpen((prev) => !prev) },
      { key: 'k', ctrlKey: true, handler: () => setIsSearchOpen((prev) => !prev) },
      { key: '.', metaKey: true, handler: () => setIsSettingsOpen((prev) => !prev) },
      { key: '.', ctrlKey: true, handler: () => setIsSettingsOpen((prev) => !prev) },
      { key: '\\', metaKey: true, handler: () => setIsInboxOpen((prev) => !prev) },
      { key: '\\', ctrlKey: true, handler: () => setIsInboxOpen((prev) => !prev) },
      { key: 'm', metaKey: true, shiftKey: true, handler: () => setTheme(getNextTheme(theme)) },
      { key: 'm', ctrlKey: true, shiftKey: true, handler: () => setTheme(getNextTheme(theme)) },
      {
        key: 'j',
        metaKey: true,
        shiftKey: true,
        handler: () => {
          if (jiraSyncMutation.isPending) return;
          jiraSyncMutation.mutate(undefined, {
            onSuccess: () => showToast('JIRA sync complete'),
          });
        },
      },
      {
        key: 'j',
        ctrlKey: true,
        shiftKey: true,
        handler: () => {
          if (jiraSyncMutation.isPending) return;
          jiraSyncMutation.mutate(undefined, {
            onSuccess: () => showToast('JIRA sync complete'),
          });
        },
      },
      { key: 'c', metaKey: true, shiftKey: true, handler: () => inboxRef.current?.openAddTicketForm() },
      { key: 'c', ctrlKey: true, shiftKey: true, handler: () => inboxRef.current?.openAddTicketForm() },
    ],
    [theme, setTheme, jiraSyncMutation, showToast, setIsInboxOpen],
  );
  useKeyboardShortcuts(shortcuts);

  const handleSettingsOpen = useCallback((section?: SectionId) => {
    if (section) setSettingsSection(section);
    setIsSettingsOpen(true);
  }, []);
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
    if (!open) setSettingsSection(undefined);
  }, []);
  const handleTicketSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
  }, [queryClient]);

  const settingsContextValue = useMemo(
    () => ({ openSettings: handleSettingsOpen }),
    [handleSettingsOpen],
  );

  return (
    <TicketDetailProvider>
      <SettingsContext.Provider value={settingsContextValue}>
        <DndProvider>
          <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            {!isHistoryRoute && (
              <>
                <InboxSidebar
                  isOpen={isInboxOpen}
                  isMobile={isMobileLayout}
                  onOpen={() => setIsInboxOpen(true)}
                  onClose={() => setIsInboxOpen(false)}
                  onSettingsOpen={handleSettingsOpen}
                  onSearchOpen={handleSearchOpen}
                  imperativeRef={inboxRef}
                />
                {isMobileLayout && isInboxOpen && (
                  <button
                    type="button"
                    aria-label="Close inbox sidebar"
                    className="fixed inset-0 z-40 bg-black/25"
                    onClick={() => setIsInboxOpen(false)}
                  />
                )}
                {isMobileLayout && !isInboxOpen && (
                  <button
                    type="button"
                    aria-label="Open inbox sidebar"
                    className="fixed bottom-3 left-3 z-[55] rounded-md bg-[#FDFC74] px-2.5 py-1.5 text-sm font-semibold text-black shadow-md transition-opacity hover:opacity-90"
                    onClick={() => setIsInboxOpen(true)}
                  >
                    tt
                  </button>
                )}
              </>
            )}
            <main
              className={
                isHistoryRoute
                  ? 'ml-0 transition-[margin] duration-200'
                  : isMobileLayout
                  ? 'ml-0 transition-[margin] duration-200'
                  : isInboxOpen
                  ? 'ml-80 transition-[margin] duration-200'
                  : 'ml-12 transition-[margin] duration-200'
              }
            >
              <Outlet />
            </main>
            {!isHistoryRoute && (
              <>
                <TicketDetailSidebar onSaved={handleTicketSaved} />
                <SearchDialog open={isSearchOpen} onOpenChange={handleSearchOpenChange} />
                <SettingsDialog
                  key={settingsSection ?? 'default'}
                  open={isSettingsOpen}
                  onOpenChange={handleSettingsOpenChange}
                  initialSection={settingsSection}
                />
              </>
            )}
          </div>
        </DndProvider>
      </SettingsContext.Provider>
    </TicketDetailProvider>
  );
}
