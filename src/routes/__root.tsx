import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppRail } from '@/components/AppRail';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DndProvider } from '@/contexts/DndProvider';
import { SettingsContext } from '@/contexts/settings-context';
import { TicketDetailProvider } from '@/contexts/TicketDetailContext';
import { StatusFilterProvider } from '@/contexts/StatusFilterContext';
import { InboxSidebar, useJiraSyncMutation } from '@/modules/inbox';
import type { InboxSidebarHandle } from '@/modules/inbox';
import { TicketDetailSidebar } from '@/modules/kanban';
import { SearchDialog } from '@/modules/search';
import { SettingsDialog } from '@/modules/settings';
import type { SectionId } from '@/modules/settings';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useAtlassianConnectionQuery } from '@/modules/settings/hooks/useAtlassianQuery';
import { useAtlassianOAuthRedirectHandler } from '@/modules/settings/hooks/useAtlassianOAuthRedirectHandler';

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
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const isMobileLayout = useMediaQuery('(max-width: 1023px)');
  const { activeBoard, activeBoardId } = useActiveBoard();
  const connectionQuery = useAtlassianConnectionQuery();
  useAtlassianOAuthRedirectHandler();
  const jiraConnected = !!connectionQuery.data;
  const jiraBoardShortcutsEnabled =
    jiraConnected && !!(activeBoard?.jiraEnabled);
  const jiraSyncMutation = useJiraSyncMutation(activeBoardId);
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

  const handleInboxToggle = useCallback(() => {
    if (isHistoryRoute) {
      void navigate({ to: '/' });
      setIsInboxOpen(true);
      return;
    }
    setIsInboxOpen((prev) => !prev);
  }, [isHistoryRoute, navigate, setIsInboxOpen]);

  const handleOpenHistory = useCallback(() => {
    if (isHistoryRoute) return;
    void navigate({ to: '/history' });
  }, [isHistoryRoute, navigate]);

  const shortcuts = useMemo(
    () => [
      { key: 'k', metaKey: true, handler: () => setIsSearchOpen((prev) => !prev) },
      { key: 'k', ctrlKey: true, handler: () => setIsSearchOpen((prev) => !prev) },
      { key: '.', metaKey: true, handler: () => setIsSettingsOpen((prev) => !prev) },
      { key: '.', ctrlKey: true, handler: () => setIsSettingsOpen((prev) => !prev) },
      { key: '\\', metaKey: true, handler: handleInboxToggle },
      { key: '\\', ctrlKey: true, handler: handleInboxToggle },
      { key: ']', metaKey: true, handler: handleOpenHistory },
      { key: ']', ctrlKey: true, handler: handleOpenHistory },
      {
        key: 'j',
        metaKey: true,
        handler: () => {
          if (!jiraBoardShortcutsEnabled) {
            showToast('Enable JIRA for this board in Settings');
            return;
          }
          inboxRef.current?.openJiraQuickOpen();
        },
      },
      {
        key: 'j',
        ctrlKey: true,
        handler: () => {
          if (!jiraBoardShortcutsEnabled) {
            showToast('Enable JIRA for this board in Settings');
            return;
          }
          inboxRef.current?.openJiraQuickOpen();
        },
      },
      { key: 'm', metaKey: true, shiftKey: true, handler: () => setTheme(getNextTheme(theme)) },
      { key: 'm', ctrlKey: true, shiftKey: true, handler: () => setTheme(getNextTheme(theme)) },
      {
        key: 'j',
        metaKey: true,
        shiftKey: true,
        handler: () => {
          if (!jiraBoardShortcutsEnabled) {
            showToast('Enable JIRA for this board in Settings');
            return;
          }
          if (jiraSyncMutation.isPending || !activeBoardId) return;
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
          if (!jiraBoardShortcutsEnabled) {
            showToast('Enable JIRA for this board in Settings');
            return;
          }
          if (jiraSyncMutation.isPending || !activeBoardId) return;
          jiraSyncMutation.mutate(undefined, {
            onSuccess: () => showToast('JIRA sync complete'),
          });
        },
      },
      { key: 'c', metaKey: true, shiftKey: true, handler: () => inboxRef.current?.openAddTicketForm() },
      { key: 'c', ctrlKey: true, shiftKey: true, handler: () => inboxRef.current?.openAddTicketForm() },
    ],
    [
      theme,
      setTheme,
      jiraSyncMutation,
      showToast,
      handleInboxToggle,
      handleOpenHistory,
      jiraBoardShortcutsEnabled,
      activeBoardId,
    ],
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
    void queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [queryClient]);

  const settingsContextValue = useMemo(
    () => ({ openSettings: handleSettingsOpen }),
    [handleSettingsOpen],
  );

  const mainMarginClass = (() => {
    if (isMobileLayout || isHistoryRoute || !isInboxOpen) {
      return 'ml-12 transition-[margin] duration-200';
    }
    return 'ml-[23rem] transition-[margin] duration-200';
  })();

  return (
    <TicketDetailProvider>
      <StatusFilterProvider>
      <SettingsContext.Provider value={settingsContextValue}>
        <DndProvider>
          <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            <AppRail
              isInboxOpen={isInboxOpen}
              onInboxToggle={handleInboxToggle}
              onSearchOpen={handleSearchOpen}
              onSettingsOpen={handleSettingsOpen}
            />
            {!isHistoryRoute && (
              <>
                <InboxSidebar
                  isOpen={isInboxOpen}
                  isMobile={isMobileLayout}
                  onOpen={() => setIsInboxOpen(true)}
                  onSettingsOpen={handleSettingsOpen}
                  imperativeRef={inboxRef}
                />
                {isMobileLayout && isInboxOpen && (
                  <button
                    type="button"
                    aria-label="Close inbox sidebar"
                    className="fixed inset-0 z-40 bg-black/25"
                    style={{ left: 48 }}
                    onClick={() => setIsInboxOpen(false)}
                  />
                )}
              </>
            )}
            <main className={mainMarginClass}>
              <Outlet />
            </main>
            {!isHistoryRoute && (
              <TicketDetailSidebar onSaved={handleTicketSaved} />
            )}
            <SearchDialog open={isSearchOpen} onOpenChange={handleSearchOpenChange} />
            <SettingsDialog
              key={settingsSection ?? 'default'}
              open={isSettingsOpen}
              onOpenChange={handleSettingsOpenChange}
              initialSection={settingsSection}
            />
          </div>
        </DndProvider>
      </SettingsContext.Provider>
      </StatusFilterProvider>
    </TicketDetailProvider>
  );
}
