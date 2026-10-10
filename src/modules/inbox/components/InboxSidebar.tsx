import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  ExternalLink,
  Info,
  Inbox,
  Plug,
} from "lucide-react";
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Select from "@/components/Select";
import { Switch } from "@radix-ui/themes";
import { Tooltip } from "@/components/Tooltip";
import { TicketDescriptionEditor } from "@/components/TicketDescriptionEditor";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import { useColumnsQuery } from "@/modules/kanban";
import { TicketCard } from "@/modules/kanban/components/TicketCard";
import { useBoardTerminology } from "@/modules/boards/hooks/useBoardTerminology";
import { JiraQuickOpenDialog } from "@/modules/inbox/components/JiraQuickOpenDialog";
import { JiraSyncIcon } from "@/modules/inbox/components/JiraSyncIcon";
import { useInbox } from "@/modules/inbox/hooks/useInbox";
import {
  DEFAULT_INBOX_SORT_MODE,
  INBOX_COLUMN_ID,
  normalizeInboxSortMode,
  type InboxSortMode,
} from "@/modules/inbox/types";
import { sortInboxTickets } from "@/modules/inbox/utils/sortInboxTickets";
import { SHORTCUT_DISPLAY, type SectionId } from "@/modules/settings";
import { TICKET_PRIORITY_VALUES, type TicketPriority } from "@/modules/tickets";
import { ticketMatchesStatusFilter } from "@/modules/tickets";
import { isValidTicketKey } from "@/modules/tickets/utils/validateTicketKey";
import {
  formatAbsoluteTimestamp,
  formatRelativeTimeAgo,
} from "@/utils/formatRelativeTimeAgo";

const SIDEBAR_WIDTH = 320;
const RAIL_WIDTH = 48;

export interface InboxSidebarHandle {
  openAddTicketForm: () => void;
  openJiraQuickOpen: () => void;
}

interface InboxSidebarProps {
  readonly isOpen: boolean;
  readonly isMobile: boolean;
  readonly onOpen: () => void;
  readonly onSettingsOpen: (section?: SectionId) => void;
  readonly imperativeRef?: React.Ref<InboxSidebarHandle>;
}

function syncTooltipContent(
  syncing: boolean,
  hasJiraTicketsInDb: boolean,
  itemsLabel: string,
  lastSyncedAt: string | null,
): string {
  const action = syncing
    ? hasJiraTicketsInDb
      ? "Syncing…"
      : "Fetching…"
    : hasJiraTicketsInDb
      ? `Sync JIRA (${SHORTCUT_DISPLAY.syncJira})`
      : `Fetch ${itemsLabel} (${SHORTCUT_DISPLAY.syncJira})`;
  if (!lastSyncedAt) {
    return action;
  }
  return `${action} · Last synced ${formatRelativeTimeAgo(lastSyncedAt)} (${formatAbsoluteTimestamp(lastSyncedAt)})`;
}

export function InboxSidebar({
  isOpen,
  isMobile,
  onOpen,
  onSettingsOpen,
  imperativeRef,
}: InboxSidebarProps) {
  const { setNodeRef: setInboxDropRef, isOver } = useDroppable({
    id: INBOX_COLUMN_ID,
    disabled: !isOpen,
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
  const showPriority = isBoardJiraEnabled || (activeBoard?.showPriority ?? true);
  const showDueDate = isBoardJiraEnabled || (activeBoard?.showDueDate ?? true);
  const boardJiraUi = jiraConnected && (activeBoard?.jiraEnabled ?? false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [rapidAddEnabled, setRapidAddEnabled] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const addTitleRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = addTitleRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [addTitle]);

  useEffect(() => {
    if (showAddForm && rapidAddEnabled && !adding) {
      addTitleRef.current?.focus();
    }
  }, [showAddForm, rapidAddEnabled, adding]);
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
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const resolvedSortMode = normalizeInboxSortMode(sortMode);
  const effectiveSortMode =
    showPriority || !resolvedSortMode.startsWith("priority")
      ? resolvedSortMode
      : "custom";

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

  const { filter: statusFilter } = useStatusFilter();
  const sortedInboxTickets = useMemo(
    () => sortInboxTickets(inboxTickets, effectiveSortMode),
    [inboxTickets, effectiveSortMode],
  );
  const visibleInboxTickets = useMemo(
    () =>
      sortedInboxTickets.filter((ticket) =>
        ticketMatchesStatusFilter(ticket, statusFilter),
      ),
    [sortedInboxTickets, statusFilter],
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
        if (!rapidAddEnabled) {
          setShowAddForm(false);
        }
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
        <p className="text-xs text-neutral-400/70 dark:text-neutral-500/70 max-w-[16rem]">
          {`Add a ${terminology.item} below, or drag one here to shelve it for later`}
        </p>
      </div>
    );
  } else if (visibleInboxTickets.length === 0) {
    inboxContent = isOver ? (
      <div className="flex flex-col items-center justify-center min-h-[8rem] gap-2 text-sm text-blue-600 dark:text-blue-400 transition-colors">
        <span className="font-medium">Drop here</span>
        <span className="text-xs">Release to move to inbox</span>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          {`No ${terminology.items} match this filter`}
        </p>
      </div>
    );
  } else {
    inboxContent = (
      <SortableContext
        items={visibleInboxTickets.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {visibleInboxTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              allowReorderInColumn={effectiveSortMode === "custom"}
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

  const iconButtonClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors";

  return (
    <div
      ref={setInboxDropRef}
      className={`fixed top-0 h-full bg-white dark:bg-neutral-900 shadow-xl z-50 border-r border-neutral-200 dark:border-neutral-700 overflow-hidden transition-[transform,opacity,background-color,border-color] duration-300 ease-out will-change-[transform,opacity] ${
        isOver
          ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-950/30"
          : ""
      } ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      }`}
      style={{
        left: RAIL_WIDTH,
        width: isMobile ? "min(20rem, calc(100vw - 4rem))" : SIDEBAR_WIDTH,
      }}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-full flex-col">
        <div
          className="flex items-center justify-between gap-2 px-3 border-b border-neutral-200 dark:border-neutral-700 shrink-0"
          style={{ height: 48 }}
        >
          <Select.Root
            value={effectiveSortMode}
            onValueChange={(value) =>
              setSortMode(normalizeInboxSortMode(value) as InboxSortMode)
            }
          >
            <Select.Trigger
              className="inline-flex h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
              aria-label={`Sort inbox ${terminology.items}`}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <ArrowUpDown
                  className="size-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
                  aria-hidden
                />
                <Select.Value />
              </span>
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
                  {showPriority && (
                    <Select.Item
                      value="priorityAscending"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Priority (ascending)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  )}
                  {showPriority && (
                    <Select.Item
                      value="priorityDescending"
                      className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>Priority (descending)</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  )}
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

          {isBoardJiraEnabled ? (
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="mr-1 h-5 w-px shrink-0 bg-neutral-300 dark:bg-neutral-600"
                aria-hidden
              />
              {!jiraConnected ? (
                <Tooltip content="Connect JIRA" side="bottom">
                  <button
                    type="button"
                    onClick={() => onSettingsOpen("jira")}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity"
                    aria-label="Connect JIRA"
                  >
                    <Plug className="size-3.5" aria-hidden />
                  </button>
                </Tooltip>
              ) : boardJiraUi ? (
                <>
                  <Tooltip
                    content={`Quick open issue in JIRA (${SHORTCUT_DISPLAY.jiraQuickOpen})`}
                    side="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => setQuickOpenOpen(true)}
                      className={iconButtonClass}
                      aria-label="Quick open JIRA issue"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </button>
                  </Tooltip>
                  <Tooltip
                    content={syncTooltipContent(
                      syncing,
                      hasJiraTicketsInDb,
                      terminology.items,
                      lastSyncedAt,
                    )}
                    side="bottom"
                  >
                    <button
                      type="button"
                      onClick={handleSyncFromJira}
                      aria-busy={syncing || undefined}
                      aria-disabled={syncing || undefined}
                      className={`flex h-7 w-7 items-center justify-center rounded-md bg-[#0052CC] text-white hover:bg-[#0747A6] transition-colors ${
                        syncing ? "pointer-events-none opacity-70" : ""
                      }`}
                      aria-label={
                        hasJiraTicketsInDb
                          ? "Sync from JIRA"
                          : `Fetch ${terminology.items}`
                      }
                    >
                      <JiraSyncIcon syncing={syncing} />
                    </button>
                  </Tooltip>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {showAddForm ? (
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <form onSubmit={handleAddTicket} className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rapid-add-switch"
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
                >
                  Rapid Add
                </label>
                <Switch
                  id="rapid-add-switch"
                  size="1"
                  checked={rapidAddEnabled}
                  onCheckedChange={(checked) => setRapidAddEnabled(checked)}
                  aria-label="Rapid Add"
                />
              </div>
              <textarea
                ref={addTitleRef}
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (rapidAddEnabled && e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={`${terminology.Item} title`}
                autoFocus
                rows={1}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 resize-none overflow-hidden"
              />
              {!rapidAddEnabled && (
                <TicketDescriptionEditor
                  value={addDescription}
                  onChange={setAddDescription}
                  placeholder="Description (optional)"
                  minHeight="4rem"
                />
              )}
              {!rapidAddEnabled && activeBoard?.jiraEnabled ? (
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
                        className={`w-full px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 ${
                          customKeyError
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
              {!rapidAddEnabled && showPriority && (
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
              )}
              {!rapidAddEnabled && showDueDate && (
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
              )}
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
                    setRapidAddEnabled(false);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div
          className={`relative mx-3 my-2 flex min-h-[8rem] flex-1 flex-col overflow-hidden rounded-md border-2 border-dashed transition-colors duration-150 ${
            isOver
              ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
              : "border-neutral-200/60 dark:border-neutral-600/60"
          }`}
        >
          <div
            className={`min-h-0 flex-1 overflow-y-auto p-4 ${showAddForm ? "" : "pb-16"}`}
          >
            {inboxContent}
          </div>
          {!showAddForm && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-55% to-transparent px-3 pb-3 pt-6 ${
                isOver
                  ? "from-blue-50 dark:from-blue-950"
                  : "from-white dark:from-neutral-900"
              }`}
            >
              <Tooltip
                content={`Add a local ${terminology.item} (${SHORTCUT_DISPLAY.newLocalTicket})`}
                side="top"
              >
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="pointer-events-auto w-full px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md shadow-sm transition-colors"
                >
                  {`+ Add a local ${terminology.item}`}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
      <JiraQuickOpenDialog
        open={quickOpenOpen}
        onOpenChange={setQuickOpenOpen}
      />
    </div>
  );
}
