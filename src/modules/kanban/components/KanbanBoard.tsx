import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Columns3, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Ticket } from "@/db/database";
import { MAX_COLUMN_TITLE_LENGTH } from "@/modules/kanban/constants";
import { INBOX_COLUMN_ID } from "@/modules/inbox/types";
import { FocusZone, useFocusZone, usePomodoroSettings } from "@/modules/focus";
import { useKanban } from "@/modules/kanban/hooks/useKanban";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import { useBoardTerminology } from "@/modules/boards/hooks/useBoardTerminology";
import { ticketMatchesStatusFilter } from "@/modules/tickets";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  const {
    columns,
    getTicketsForColumn,
    handleTicketMove,
    handleTicketDelete,
    handleColumnTitleUpdate,
    handleColumnCreate,
    handleColumnDelete,
    creatingColumn,
    deletingColumn,
    deletingTicket,
    loading,
  } = useKanban();
  const { activeBoard } = useActiveBoard();
  const statusFilter = useStatusFilter();
  const terminology = useBoardTerminology(activeBoard);
  const { focusedData, focusActive, startFocus, endFocus } = useFocusZone();
  const { settings: focusSettings, loaded: focusSettingsLoaded } = usePomodoroSettings();
  const focusEnabled = focusSettings.enabled;
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [showCreateColumnInput, setShowCreateColumnInput] = useState(false);
  const createColumnInputRef = useRef<HTMLInputElement>(null);

  const hasColumns = columns.length > 0;

  const moveTargets = useMemo(
    () => [{ id: INBOX_COLUMN_ID, title: "Inbox" }, ...columns],
    [columns],
  );

  const handleStartFocus = useCallback(
    (ticket: Ticket) => {
      if (!focusEnabled || focusActive) return;
      startFocus(ticket);
    },
    [focusEnabled, focusActive, startFocus],
  );

  useEffect(() => {
    if (!focusSettingsLoaded || focusEnabled || !focusActive) {
      return;
    }
    void endFocus();
  }, [focusSettingsLoaded, focusEnabled, focusActive, endFocus]);

  useEffect(() => {
    if (showCreateColumnInput) {
      createColumnInputRef.current?.focus();
    }
  }, [showCreateColumnInput]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  const handleCreateSubmit = () => {
    const normalizedTitle = newColumnTitle.trim();
    if (!normalizedTitle) {
      return;
    }
    handleColumnCreate(normalizedTitle);
    setNewColumnTitle("");
    setShowCreateColumnInput(false);
  };

  const addColumnControls = hasColumns ? (
    <div className="flex shrink-0 justify-end px-3 sm:px-4 lg:px-6 pb-2">
      {showCreateColumnInput ? (
        <div className="flex w-full basis-full sm:basis-auto sm:w-auto flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            maxLength={MAX_COLUMN_TITLE_LENGTH}
            placeholder="New column title"
            className="h-9 sm:h-8 w-full sm:w-52 px-3 text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateSubmit();
              } else if (e.key === "Escape") {
                setShowCreateColumnInput(false);
                setNewColumnTitle("");
              }
            }}
            ref={createColumnInputRef}
          />
          <button
            type="button"
            onClick={handleCreateSubmit}
            disabled={creatingColumn}
            className="h-9 sm:h-8 px-3 text-sm font-medium rounded border border-neutral-200 dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateColumnInput(false);
              setNewColumnTitle("");
            }}
            className="h-9 sm:h-8 px-3 text-sm font-medium rounded border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateColumnInput(true)}
          className="inline-flex items-center justify-center gap-2 h-9 sm:h-8 px-3 text-sm font-medium rounded border border-neutral-200 dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 whitespace-nowrap"
        >
          <Plus className="size-4" aria-hidden />
          Add column
        </button>
      )}
    </div>
  ) : null;

  const renderBoardContent = () => (
    <>
      {addColumnControls}

      {hasColumns ? (
        <SortableContext
          items={columns.map((column) => column.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex-1 flex gap-3 sm:gap-4 px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 overflow-x-auto min-h-0">
            {columns.map((column) => {
              const columnTickets = getTicketsForColumn(column.id);
              const visibleTickets = columnTickets.filter((ticket) =>
                ticketMatchesStatusFilter(ticket, statusFilter.filter),
              );
              return (
                <SortableContext
                  key={column.id}
                  items={visibleTickets.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <KanbanColumn
                    column={column}
                    tickets={visibleTickets}
                    totalTicketCount={statusFilter.isActive ? columnTickets.length : undefined}
                    moveTargets={moveTargets}
                    onTitleUpdate={handleColumnTitleUpdate}
                    onDelete={handleColumnDelete}
                    deleting={deletingColumn}
                    onTicketMove={handleTicketMove}
                    onTicketDelete={handleTicketDelete}
                    deletingTicket={deletingTicket}
                    onStartFocus={focusEnabled ? handleStartFocus : undefined}
                    focusActive={focusActive}
                    focusedTicketId={focusedData?.ticket.id}
                    itemPluralWord={terminology.items}
                    itemSingularWord={terminology.item}
                  />
                </SortableContext>
              );
            })}
          </div>
        </SortableContext>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700">
              <Columns3
                className="size-6 text-neutral-500 dark:text-neutral-400"
                aria-hidden
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                No columns yet
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Add a column to start organizing tickets on the board.
              </p>
            </div>
            {showCreateColumnInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  maxLength={MAX_COLUMN_TITLE_LENGTH}
                  placeholder="Column title"
                  className="h-9 w-48 px-3 text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateSubmit();
                    } else if (e.key === "Escape") {
                      setShowCreateColumnInput(false);
                      setNewColumnTitle("");
                    }
                  }}
                  ref={createColumnInputRef}
                />
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={creatingColumn}
                  className="h-9 px-4 text-sm font-medium rounded-md border border-neutral-200 dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateColumnInput(false);
                    setNewColumnTitle("");
                  }}
                  className="h-9 px-3 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateColumnInput(true)}
                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md border border-neutral-200 dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <Plus className="size-4" aria-hidden />
                Add column
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {focusEnabled && (
        <FocusZone focusedData={focusedData} onEndFocus={endFocus} />
      )}

      {renderBoardContent()}
    </div>
  );
}
