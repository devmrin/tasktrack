import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { BoardDeleteConfirmationDialog } from "@/modules/boards/components/BoardDeleteConfirmationDialog";
import { getBoardStats } from "@/modules/boards/services/board.service";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import {
  useCreateBoardMutation,
  useDeleteBoardMutation,
  useRenameBoardMutation,
} from "@/modules/boards/hooks/useBoardsQuery";

export function BoardSwitcher() {
  const { boards, activeBoard, activeBoardId, setActiveBoardId, isLoading } =
    useActiveBoard();
  const createBoardMutation = useCreateBoardMutation();
  const renameBoardMutation = useRenameBoardMutation();
  const deleteBoardMutation = useDeleteBoardMutation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<{
    id: string;
    name: string;
    ticketCount: number;
    itemLabel: "tickets" | "tasks";
  } | null>(null);

  const displayName = activeBoard?.name ?? (isLoading ? "Loading…" : "Board");

  function handleCreateSubmit() {
    const name = newBoardName.trim();
    if (!name) return;
    createBoardMutation.mutate(name, {
      onSuccess: (created) => {
        setActiveBoardId(created.id);
        setNewBoardName("");
        setCreateDialogOpen(false);
        setMenuOpen(false);
      },
    });
  }

  function openRename(boardId: string, currentName: string) {
    setRenameBoardId(boardId);
    setRenameDraft(currentName);
    setRenameDialogOpen(true);
    setMenuOpen(false);
  }

  function handleRenameSubmit() {
    if (!renameBoardId) return;
    const name = renameDraft.trim();
    if (!name) return;
    renameBoardMutation.mutate(
      { boardId: renameBoardId, name },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
          setRenameBoardId(null);
        },
      },
    );
  }

  async function handleDelete(
    boardId: string,
    boardName: string,
    onlyBoard: boolean,
    isDefault: boolean,
    itemLabel: "tickets" | "tasks",
  ) {
    if (onlyBoard || isDefault) {
      return;
    }
    const stats = await getBoardStats(boardId);
    setBoardToDelete({ id: boardId, name: boardName, ticketCount: stats.ticketCount, itemLabel });
    setDeleteDialogOpen(true);
    setMenuOpen(false);
  }

  function handleDeleteConfirm() {
    if (!boardToDelete) {
      return;
    }

    deleteBoardMutation.mutate(boardToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setBoardToDelete(null);
      },
    });
  }

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 min-w-0 max-w-[min(100%,20rem)] text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:opacity-80 transition-opacity rounded px-1 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
            aria-label="Switch board"
            disabled={isLoading || boards.length === 0}
          >
            <span className="truncate">{displayName}</span>
            <ChevronDown
              className="size-4 shrink-0 text-neutral-500"
              aria-hidden
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[15rem] z-[101] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            align="start"
            sideOffset={6}
          >
            {boards.map((b) => {
              const selected = b.id === activeBoardId;
              const onlyBoard = boards.length <= 1;
              const blockedDelete = onlyBoard || b.isDefault;

              return (
                <div key={b.id} className="flex items-stretch">
                  <DropdownMenu.Item
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none cursor-default text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                    onSelect={() => {
                      setActiveBoardId(b.id);
                      setMenuOpen(false);
                    }}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center text-neutral-500">
                      {selected ? (
                        <Check className="size-4" aria-hidden />
                      ) : null}
                    </span>
                    <span className="truncate text-left">{b.name}</span>
                  </DropdownMenu.Item>
                  <div className="flex shrink-0 items-center gap-0.5 pr-1 py-1">
                    <button
                      type="button"
                      title="Rename board"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openRename(b.id, b.name);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      <span className="sr-only">Rename board</span>
                    </button>
                    <button
                      type="button"
                      disabled={blockedDelete || deleteBoardMutation.isPending}
                      title={
                        blockedDelete
                          ? b.isDefault
                            ? "Cannot delete default board"
                            : "Cannot delete the only board"
                          : "Delete board"
                      }
                      className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleDelete(b.id, b.name, onlyBoard, b.isDefault, b.jiraEnabled ? "tickets" : "tasks");
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      <span className="sr-only">Delete board</span>
                    </button>
                  </div>
                </div>
              );
            })}

            <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm outline-none cursor-default text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
              onSelect={(event) => {
                event.preventDefault();
                setCreateDialogOpen(true);
                setMenuOpen(false);
              }}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Create new board…
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 focus:outline-none">
            <Dialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              New board
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Enter a name for the new board
            </Dialog.Description>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSubmit();
                }
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newBoardName.trim() || createBoardMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                onClick={handleCreateSubmit}
              >
                {createBoardMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Create
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 focus:outline-none">
            <Dialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Rename board
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Change the board name
            </Dialog.Description>
            <input
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameSubmit();
                }
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!renameDraft.trim() || renameBoardMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                onClick={handleRenameSubmit}
              >
                {renameBoardMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <BoardDeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setBoardToDelete(null);
          }
        }}
        boardName={boardToDelete?.name ?? null}
        ticketCount={boardToDelete?.ticketCount ?? 0}
        itemLabel={boardToDelete?.itemLabel ?? "tasks"}
        loading={deleteBoardMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
