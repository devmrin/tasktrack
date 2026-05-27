import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDown,
  ChevronLeft,
  Check,
  ExternalLink,
  History,
  Info,
  Inbox,
  Moon,
  Plug,
  Search,
  Settings2,
  Sun,
} from "lucide-react";
import { useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Select from "@/components/Select";
import { StableWidthLabel } from "@/components/StableWidthLabel";
import {
  GettingStartedDialog,
  SHORTCUT_DISPLAY,
  type SectionId,
} from "@/modules/settings";
import { useColumnsQuery } from "@/modules/kanban";
import { JiraSyncIcon } from "@/modules/inbox/components/JiraSyncIcon";
import { LastSyncedLabel } from "@/modules/inbox/components/LastSyncedLabel";
import { useInbox } from "@/modules/inbox/hooks/useInbox";
import { isValidTicketKey } from "@/modules/tickets/utils/validateTicketKey";
import { TicketCard } from "@/modules/kanban/components/TicketCard";
import {
  DEFAULT_INBOX_SORT_MODE,
  INBOX_COLUMN_ID,
  normalizeInboxSortMode,
  type InboxSortMode,
} from "@/modules/inbox/types";
import { Tooltip } from "@/components/Tooltip";
import { TicketDescriptionEditor } from "@/components/TicketDescriptionEditor";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TICKET_PRIORITY_VALUES, type TicketPriority } from "@/modules/tickets";
import { sortInboxTickets } from "@/modules/inbox/utils/sortInboxTickets";
import { JiraQuickOpenDialog } from "@/modules/inbox/components/JiraQuickOpenDialog";
import { useBoardTerminology } from "@/modules/boards/hooks/useBoardTerminology";

const SIDEBAR_WIDTH = 320;
const SIDEBAR_COLLAPSED_WIDTH = 48;

export interface InboxSidebarHandle {
  openAddTicketForm: () => void;
  openJiraQuickOpen: () => void;
}

interface InboxSidebarProps {
  readonly isOpen: boolean;
  readonly isMobile: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onSettingsOpen: (section?: SectionId) => void;
  readonly onSearchOpen: () => void;
  readonly imperativeRef?: React.Ref<InboxSidebarHandle>;
}

function getNextTheme(current: "light" | "dark"): "light" | "dark" {
  return current === "light" ? "dark" : "light";
}

export function InboxSidebar({
  isOpen,
  isMobile,
  onOpen,
  onClose,
  onSettingsOpen,
  onSearchOpen,
  imperativeRef,
}: InboxSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { setNodeRef: setInboxDropRef, isOver } = useDroppable({
    id: INBOX_COLUMN_ID,
  });
  const { showToast } = useToast();
  const {
    activeBoard,
    activeBoardId,
    inboxTickets,
    loading,
    jiraConnected,
    hasJiraTicketsInDb,
    jiraTickets,
    syncing,
    adding,
    moveTicketToColumn,
    handleTicketDelete,
    deletingTicket,
    addTicketToInbox,
    syncFromJira,
  } = useInbox();
  const columnsQuery = useColumnsQuery(activeBoardId);
  const columns = columnsQuery.data ?? [];
  const terminology = useBoardTerminology(activeBoard);
  const isBoardJiraEnabled = activeBoard?.jiraEnabled ?? false;
  const boardJiraUi = jiraConnected && (activeBoard?.jiraEnabled ?? false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [ticketKeyMode, setTicketKeyMode] = useState<
    "none" | "existing" | "other"
  >("none");
  const [selectedKey, setSelectedKey] = useState("");
  const [customKeyInput, setCustomKeyInput] = useState("");
  const [customKeyError, setCustomKeyError] = useState("");
  const [addPriority, setAddPriority] = useState<TicketPriority | "none">(
    "none",
  );
  const [addDueDate, setAddDueDate] = useState("");
  const [sortMode, setSortMode] = useLocalStorage<InboxSortMode>(
    "tasktrack.inbox.sortMode",
    DEFAULT_INBOX_SORT_MODE,
  );
  const [lastSyncedAt, setLastSyncedAt] = useLocalStorage<string | null>(
    "tasktrack.inbox.lastSyncedAt",
    null,
  );
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const resolvedSortMode = normalizeInboxSortMode(sortMode);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- add-ticket key fields are board-scoped; reset when board changes */
    setTicketKeyMode("none");
    setSelectedKey("");
    setCustomKeyInput("");
    setCustomKeyError("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeBoard?.id]);

  useImperativeHandle(
    imperativeRef,
    () => ({
      openAddTicketForm: () => {
        if (!isOpen) onOpen();
        setShowAddForm(true);
      },
      openJiraQuickOpen: () => {
        if (!jiraConnected) {
          showToast("Connect JIRA in Settings to use Quick open");
          return;
        }
        if (!activeBoard?.jiraEnabled) {
          showToast("Enable JIRA for this board in Settings");
          return;
        }
        if (!isOpen) onOpen();
        setQuickOpenOpen(true);
      },
    }),
    [isOpen, jiraConnected, activeBoard?.jiraEnabled, onOpen, showToast],
  );

  const jiraKeyOptions = useMemo(
    () =>
      jiraTickets.map((t) => t.jiraData?.jiraKey).filter(Boolean) as string[],
    [jiraTickets],
  );

  const sortedInboxTickets = useMemo(
    () => sortInboxTickets(inboxTickets, resolvedSortMode),
    [inboxTickets, resolvedSortMode],
  );

  const handleSyncFromJira = () => {
    if (syncing) {
      return;
    }
    syncFromJira(({ created, updated }) => {
      const parts: string[] = [];
      if (created.length > 0) parts.push(`${created.length} new`);
      if (updated.length > 0) parts.push(`${updated.length} updated`);
      showToast(
        parts.length > 0
          ? `Synced from JIRA: ${parts.join(", ")}`
          : "JIRA sync complete — everything up to date",
      );
      setLastSyncedAt(new Date().toISOString());
    });
  };

  const resolvedCustomKey =
    ticketKeyMode === "existing"
      ? selectedKey
      : ticketKeyMode === "other"
        ? customKeyInput.trim().toUpperCase()
        : undefined;

  const handleAddTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = addTitle.trim();
    if (!title) return;

    if (ticketKeyMode === "other") {
      const key = customKeyInput.trim().toUpperCase();
      if (!key) {
        setCustomKeyError('Issue key is required when "Other" is selected');
        return;
      }
      if (!isValidTicketKey(key)) {
        setCustomKeyError("Must be in format PROJ-123");
        return;
      }
    }

    const finalKey =
      resolvedCustomKey && isValidTicketKey(resolvedCustomKey)
        ? resolvedCustomKey
        : undefined;
    const resolvedPriority = addPriority === "none" ? undefined : addPriority;
    const resolvedDueDate = addDueDate.trim() || undefined;

    addTicketToInbox(
      title,
      addDescription.trim() || undefined,
      finalKey,
      resolvedPriority,
      resolvedDueDate,
      () => {
        setAddTitle("");
        setAddDescription("");
        setTicketKeyMode("none");
        setSelectedKey("");
        setCustomKeyInput("");
        setCustomKeyError("");
        setAddPriority("none");
        setAddDueDate("");
        setShowAddForm(false);
      },
    );
  };

  let inboxContent: React.ReactNode;
  if (loading) {
    inboxContent = (
      <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
        Loading...
      </div>
    );
  } else if (sortedInboxTickets.length === 0) {
    inboxContent = isOver ? (
      <div className="flex flex-col items-center justify-center min-h-[8rem] gap-2 text-sm text-blue-600 dark:text-blue-400 transition-colors">
        <span className="font-medium">Drop here</span>
        <span className="text-xs">Release to move to inbox</span>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <Inbox
          className="size-8 text-neutral-300 dark:text-neutral-600"
          aria-hidden
        />
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Your inbox is empty
        </p>
        <p className="text-xs text-neutral-400/70 dark:text-neutral-500/70">
          {`Add a ${terminology.item} above, or drag one here to shelve it for later`}
        </p>
      </div>
    );
  } else {
    inboxContent = (
      <SortableContext
        items={sortedInboxTickets.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {sortedInboxTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              allowReorderInColumn={resolvedSortMode === "custom"}
              moveTargets={columns}
              onMove={moveTicketToColumn}
              onDelete={handleTicketDelete}
              deleting={deletingTicket}
            />
          ))}
        </div>
      </SortableContext>
    );
  }

  return (
    <div
      ref={setInboxDropRef}
      className={`fixed left-0 top-0 h-full bg-white dark:bg-neutral-900 shadow-xl z-50 border-r border-neutral-200 dark:border-neutral-700 overflow-hidden transition-[width,transform,background-color,border-color] duration-300 ease-out will-change-[width,transform] ${!isOpen && isOver
        ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-950/30"
        : ""
        } ${isMobile && !isOpen ? "-translate-x-full pointer-events-none" : "translate-x-0"}`}
      style={{
        width: isMobile
          ? "min(20rem, calc(100vw - 1.5rem))"
          : isOpen
            ? SIDEBAR_WIDTH
            : SIDEBAR_COLLAPSED_WIDTH,
      }}
    >
      {!isMobile && (
        <div
          className={`absolute inset-y-0 left-0 w-12 flex flex-col transition-[opacity,transform,filter] duration-200 ease-out will-change-[opacity,transform,filter] ${isOpen
            ? "opacity-0 pointer-events-none -translate-x-1 blur-[2px]"
            : "opacity-100 translate-x-0 blur-0"
            }`}
          aria-hidden={isOpen}
        >
          <div
            className="flex items-center justify-center shrink-0 border-b border-neutral-200 dark:border-neutral-700"
            style={{ height: 48 }}
          >
            <button
              type="button"
              onClick={onOpen}
              className="text-lg font-semibold text-black bg-[#FDFC74] px-2 py-1 rounded-md hover:opacity-90 transition-opacity"
              aria-label="Open inbox"
            >
              tt
            </button>
          </div>
          <div className="flex flex-col items-center gap-3 pt-3 shrink-0">
            <Tooltip
              content={`Search (${SHORTCUT_DISPLAY.search})`}
              side="right"
            >
              <button
                type="button"
                onClick={onSearchOpen}
                className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md transition-colors"
                aria-label={`Search ${terminology.items}`}
              >
                <Search className="size-5" aria-hidden />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className={`flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-2 py-2 cursor-pointer transition-colors rounded-md mx-auto ${isOver
              ? "bg-blue-100/80 dark:bg-blue-900/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 focus-visible:ring-inset`}
            aria-label="Open inbox"
          >
            <div className="w-px flex-1 min-h-[12px] bg-neutral-200 dark:bg-neutral-700" />
            {isOver ? (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 [writing-mode:vertical-rl] rotate-180 select-none tracking-widest uppercase shrink-0">
                Drop here
              </span>
            ) : (
              <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 [writing-mode:vertical-rl] rotate-180 select-none tracking-widest uppercase shrink-0">
                Open Inbox
              </span>
            )}
            <div className="w-px flex-1 min-h-[12px] bg-neutral-200 dark:bg-neutral-700" />
          </button>
          <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-2 flex flex-col items-center gap-1">
            <Tooltip
              content={`Settings (${SHORTCUT_DISPLAY.settings})`}
              side="right"
            >
              <button
                type="button"
                onClick={() => onSettingsOpen()}
                className="flex items-center justify-center p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
                aria-label="Settings"
              >
                <Settings2 className="size-5" aria-hidden />
              </button>
            </Tooltip>
            <Tooltip content="Getting started" side="right">
              <button
                type="button"
                onClick={() => setGettingStartedOpen(true)}
                className="flex items-center justify-center p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
                aria-label="Open getting started"
              >
                <Info className="size-5" aria-hidden />
              </button>
            </Tooltip>
            <Tooltip
              content={`Toggle theme (${SHORTCUT_DISPLAY.toggleTheme})`}
              side="right"
            >
              <button
                type="button"
                onClick={() => setTheme(getNextTheme(theme))}
                className="flex items-center justify-center p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Sun className="size-5" aria-hidden />
                ) : (
                  <Moon className="size-5" aria-hidden />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-y-0 left-0 flex h-full flex-col transition-[opacity,transform,filter] duration-200 ease-out will-change-[opacity,transform,filter] ${isMobile ? "w-full" : "w-[320px]"
          } ${!isOpen && !isMobile
            ? "opacity-0 pointer-events-none translate-x-2 blur-[3px]"
            : "opacity-100 translate-x-0 blur-0"
          }`}
        aria-hidden={!isOpen && !isMobile}
      >
        <div
          className="flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0"
          style={{ height: 48 }}
        >
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex items-center gap-1.5 h-7 px-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
            aria-label={`Search ${terminology.items}`}
          >
            <Search className="size-3.5" aria-hidden />
            <span className="text-neutral-400 dark:text-neutral-500">Search</span>
            <kbd className="ml-1 px-1 py-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded">
              {SHORTCUT_DISPLAY.search}
            </kbd>
          </button>
          <div className="flex items-center gap-1">
            <Link
              to="/history"
              className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
              aria-label="Open history page"
            >
              <History className="size-3.5" aria-hidden />
              <span>History</span>
            </Link>
            <Tooltip
              content={`Collapse sidebar (${SHORTCUT_DISPLAY.toggleSidebar})`}
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            </Tooltip>
          </div>
        </div>
        {isBoardJiraEnabled ? (
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-end gap-1.5">
              {!jiraConnected ? (
                <button
                  type="button"
                  onClick={() => onSettingsOpen("jira")}
                  className="flex h-7 items-center gap-1.5 px-2.5 text-xs font-medium rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity"
                  aria-label="Connect JIRA"
                >
                  <Plug className="size-3.5" aria-hidden />
                  Connect JIRA
                </button>
              ) : boardJiraUi ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tooltip
                    content={`Quick open issue in JIRA (${SHORTCUT_DISPLAY.jiraQuickOpen})`}
                    side="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => setQuickOpenOpen(true)}
                      className="flex h-7 items-center gap-1.5 px-2.5 text-xs font-medium rounded-md text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                      aria-label="Quick open JIRA issue"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Quick open
                      <kbd className="ml-0.5 px-1 py-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded">
                        {SHORTCUT_DISPLAY.jiraQuickOpen}
                      </kbd>
                    </button>
                  </Tooltip>
                  {!hasJiraTicketsInDb ? (
                    <Tooltip
                      content={`Fetch ${terminology.items} (${SHORTCUT_DISPLAY.syncJira})`}
                      side="bottom"
                    >
                      <button
                        type="button"
                        onClick={handleSyncFromJira}
                        aria-busy={syncing || undefined}
                        aria-disabled={syncing || undefined}
                        className={`flex h-7 items-center gap-1.5 px-2.5 text-xs font-medium rounded-md bg-[#0052CC] text-white hover:bg-[#0747A6] transition-colors ${syncing ? "pointer-events-none opacity-70" : ""
                          }`}
                        aria-label={`Fetch ${terminology.items}`}
                      >
                        <JiraSyncIcon syncing={syncing} />
                        <StableWidthLabel
                          variants={[
                            `Fetch ${terminology.items}`,
                            "Fetching…",
                          ]}
                        >
                          {syncing
                            ? "Fetching…"
                            : `Fetch ${terminology.items}`}
                        </StableWidthLabel>
                        <kbd className="ml-0.5 px-1 py-0.5 text-[10px] font-medium text-white/85 bg-white/20 border border-white/30 rounded">
                          {SHORTCUT_DISPLAY.syncJira}
                        </kbd>
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      content={`Sync JIRA (${SHORTCUT_DISPLAY.syncJira})`}
                      side="bottom"
                    >
                      <button
                        type="button"
                        onClick={handleSyncFromJira}
                        aria-busy={syncing || undefined}
                        aria-disabled={syncing || undefined}
                        className={`flex h-7 items-center gap-1.5 px-2.5 text-xs font-medium rounded-md bg-[#0052CC] text-white hover:bg-[#0747A6] transition-colors ${syncing ? "pointer-events-none opacity-70" : ""
                          }`}
                        aria-label="Sync from JIRA"
                      >
                        <JiraSyncIcon syncing={syncing} />
                        <StableWidthLabel variants={["Sync JIRA", "Syncing…"]}>
                          {syncing ? "Syncing…" : "Sync JIRA"}
                        </StableWidthLabel>
                        <kbd className="ml-0.5 px-1 py-0.5 text-[10px] font-medium text-white/85 bg-white/20 border border-white/30 rounded">
                          {SHORTCUT_DISPLAY.syncJira}
                        </kbd>
                      </button>
                    </Tooltip>
                  )}
                </div>
              ) : null}
            </div>
            {lastSyncedAt && boardJiraUi && (
              <LastSyncedLabel isoString={lastSyncedAt} />
            )}
          </div>
        ) : null}

        <div className="px-4 pt-3 pb-2 shrink-0 border-b border-neutral-100 dark:border-neutral-800">
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Sort by
            </span>
            <Select.Root
              value={resolvedSortMode}
              onValueChange={(value) =>
                setSortMode(normalizeInboxSortMode(value) as InboxSortMode)
              }
            >
              <Select.Trigger
                className="inline-flex h-8 flex-1 items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
                aria-label={`Sort inbox ${terminology.items}`}
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown
                    className="size-3 text-neutral-500 dark:text-neutral-400"
                    aria-hidden
                  />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="z-[60] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
                  position="popper"
                  sideOffset={4}
                  align="start"
                >
                  <Select.Viewport className="p-1">
                    <Select.Item
                      value="custom"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Custom</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="priorityAscending"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Priority (ascending)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="priorityDescending"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Priority (descending)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="createdNewest"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Created (newest)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="createdOldest"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Created (oldest)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="updatedNewest"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Updated (newest)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="updatedOldest"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Updated (oldest)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          {showAddForm ? (
            <form onSubmit={handleAddTicket} className="space-y-2">
              <textarea
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder={`${terminology.Item} title`}
                autoFocus
                rows={1}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 resize-none"
              />
              <TicketDescriptionEditor
                value={addDescription}
                onChange={setAddDescription}
                placeholder="Description (optional)"
                minHeight="4rem"
              />
              {activeBoard?.jiraEnabled ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {`Relates to ${terminology.item} ID (optional)`}
                    </span>
                    <Tooltip
                      content="For reference only. You may optionally relate this item to an existing JIRA issue for improved tracking"
                      side="top"
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
                        aria-label="Relation info"
                      >
                        <Info className="size-3.5" aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                  <Select.Root
                    value={
                      ticketKeyMode === "existing" ? selectedKey : ticketKeyMode
                    }
                    onValueChange={(val) => {
                      setCustomKeyError("");
                      if (val === "none") {
                        setTicketKeyMode("none");
                        setSelectedKey("");
                        setCustomKeyInput("");
                      } else if (val === "other") {
                        setTicketKeyMode("other");
                        setSelectedKey("");
                      } else {
                        setTicketKeyMode("existing");
                        setSelectedKey(val);
                        setCustomKeyInput("");
                      }
                    }}
                  >
                    <Select.Trigger
                      className="inline-flex w-full items-center justify-between px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 outline-none"
                      aria-label={`${terminology.Item} ID`}
                    >
                      <Select.Value placeholder={`No ${terminology.item} ID`} />
                      <Select.Icon>
                        <ChevronDown
                          className="size-3.5 text-neutral-500 dark:text-neutral-400"
                          aria-hidden
                        />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        allowSearch
                        searchPlaceholder={`Search ${terminology.item} ID`}
                        className="z-[60] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
                        position="popper"
                        sideOffset={4}
                        align="start"
                      >
                        <Select.Viewport className="p-1">
                          <Select.Item
                            value="none"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                          >
                            <Select.ItemText>{`No ${terminology.item} ID`}</Select.ItemText>
                            <Select.ItemIndicator className="ml-auto">
                              <Check className="size-3.5" aria-hidden />
                            </Select.ItemIndicator>
                          </Select.Item>
                          {jiraKeyOptions.length > 0 && (
                            <Select.Group>
                              <Select.Label className="px-3 py-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                {`Synced JIRA ${terminology.items}`}
                              </Select.Label>
                              {jiraKeyOptions.map((key) => (
                                <Select.Item
                                  key={key}
                                  value={key}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                                >
                                  <Select.ItemText>
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                        {key}
                                      </span>
                                    </span>
                                  </Select.ItemText>
                                  <Select.ItemIndicator className="ml-auto">
                                    <Check className="size-3.5" aria-hidden />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Group>
                          )}
                          <Select.Separator className="h-px my-1 bg-neutral-200 dark:bg-neutral-700" />
                          <Select.Item
                            value="other"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                          >
                            <Select.ItemText>
                              Other (enter manually)
                            </Select.ItemText>
                            <Select.ItemIndicator className="ml-auto">
                              <Check className="size-3.5" aria-hidden />
                            </Select.ItemIndicator>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                  {ticketKeyMode === "other" && (
                    <div>
                      <input
                        type="text"
                        value={customKeyInput}
                        onChange={(e) => {
                          setCustomKeyInput(e.target.value);
                          if (customKeyError) setCustomKeyError("");
                        }}
                        onBlur={() => {
                          const val = customKeyInput.trim().toUpperCase();
                          if (val && !isValidTicketKey(val)) {
                            setCustomKeyError("Must be in format PROJ-123");
                          }
                        }}
                        placeholder="e.g. PROJ-123"
                        className={`w-full px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 ${customKeyError
                          ? "border-red-400 dark:border-red-500"
                          : "border-neutral-300 dark:border-neutral-600"
                          }`}
                      />
                      {customKeyError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          {customKeyError}
                        </p>
                      )}
                    </div>
                  )}
                  {ticketKeyMode === "existing" && selectedKey && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Currently selected:
                      </span>
                      <span className="inline-block text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                        {selectedKey}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Priority (optional)
                </span>
                <Select.Root
                  value={addPriority}
                  onValueChange={(value) =>
                    setAddPriority(value as TicketPriority | "none")
                  }
                >
                  <Select.Trigger
                    className="inline-flex w-full items-center justify-between px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 outline-none"
                    aria-label="Priority"
                  >
                    <Select.Value placeholder="No priority" />
                    <Select.Icon>
                      <ChevronDown
                        className="size-3.5 text-neutral-500 dark:text-neutral-400"
                        aria-hidden
                      />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="z-[60] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
                      position="popper"
                      sideOffset={4}
                      align="start"
                    >
                      <Select.Viewport className="p-1">
                        <Select.Item
                          value="none"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                        >
                          <Select.ItemText>No priority</Select.ItemText>
                          <Select.ItemIndicator className="ml-auto">
                            <Check className="size-3.5" aria-hidden />
                          </Select.ItemIndicator>
                        </Select.Item>
                        {TICKET_PRIORITY_VALUES.map((priority) => (
                          <Select.Item
                            key={priority}
                            value={priority}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                          >
                            <Select.ItemText>{priority}</Select.ItemText>
                            <Select.ItemIndicator className="ml-auto">
                              <Check className="size-3.5" aria-hidden />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ticket-due-date"
                  className="block text-xs font-medium text-neutral-500 dark:text-neutral-400"
                >
                  Due date (optional)
                </label>
                <input
                  id="ticket-due-date"
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding || !addTitle.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50"
                >
                  {adding ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddTitle("");
                    setAddDescription("");
                    setTicketKeyMode("none");
                    setSelectedKey("");
                    setCustomKeyInput("");
                    setCustomKeyError("");
                    setAddPriority("none");
                    setAddDueDate("");
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <Tooltip
              content={`Add a local ${terminology.item} (${SHORTCUT_DISPLAY.newLocalTicket})`}
              side="top"
            >
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                {`+ Add a local ${terminology.item}`}
              </button>
            </Tooltip>
          )}
        </div>

        <div
          className={`mx-3 my-2 flex-1 overflow-y-auto min-h-[8rem] rounded-md border-2 border-dashed p-4 transition-colors duration-150 ${isOver
            ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
            : "border-neutral-200/60 dark:border-neutral-600/60"
            }`}
        >
          {inboxContent}
        </div>
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 p-3 flex items-center justify-between gap-2">
          <Tooltip
            content={`Settings (${SHORTCUT_DISPLAY.settings})`}
            side="top"
          >
            <button
              type="button"
              onClick={() => onSettingsOpen()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md transition-colors"
              aria-label="Settings"
            >
              <Settings2 className="size-5 shrink-0" aria-hidden />
              Settings
            </button>
          </Tooltip>
          <div className="flex items-center gap-1">
            <Tooltip content="Getting started" side="top">
              <button
                type="button"
                onClick={() => setGettingStartedOpen(true)}
                className="flex items-center justify-center p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
                aria-label="Open getting started"
              >
                <Info className="size-5" aria-hidden />
              </button>
            </Tooltip>
            <Tooltip
              content={`Toggle theme (${SHORTCUT_DISPLAY.toggleTheme})`}
              side="top"
            >
              <button
                type="button"
                onClick={() => setTheme(getNextTheme(theme))}
                className="flex items-center justify-center p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Sun className="size-5" aria-hidden />
                ) : (
                  <Moon className="size-5" aria-hidden />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      <GettingStartedDialog
        open={gettingStartedOpen}
        onOpenChange={setGettingStartedOpen}
      />
      <JiraQuickOpenDialog open={quickOpenOpen} onOpenChange={setQuickOpenOpen} />
    </div>
  );
}
