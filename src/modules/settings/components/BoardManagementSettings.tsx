import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Pencil,
  Trash2,
  Download,
} from 'lucide-react';
import {
  useBoardsQuery,
  useDeleteBoardMutation,
  useExportBoardMutation,
  useRenameBoardMutation,
  useReorderBoardsMutation,
  useSetDefaultBoardMutation,
} from '@/modules/boards/hooks/useBoardsQuery';
import { getBoardStats, type BoardStats } from '@/modules/boards/services/board.service';
import type { Board } from '@/db/database';
import * as Dialog from '@radix-ui/react-dialog';

export function BoardManagementSettings() {
  const boardsQuery = useBoardsQuery();
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const renameMutation = useRenameBoardMutation();
  const deleteMutation = useDeleteBoardMutation();
  const setDefaultMutation = useSetDefaultBoardMutation();
  const reorderMutation = useReorderBoardsMutation();
  const exportMutation = useExportBoardMutation();

  const [statsByBoard, setStatsByBoard] = useState<Record<string, BoardStats>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, BoardStats> = {};
      await Promise.all(
        boards.map(async (b) => {
          next[b.id] = await getBoardStats(b.id);
        }),
      );
      if (!cancelled) {
        setStatsByBoard(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boards]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  function handleMove(boardId: string, direction: -1 | 1) {
    const ids = [...boards]
      .sort((a, b) => a.order - b.order)
      .map((b) => b.id);
    const index = ids.indexOf(boardId);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const reordered = [...ids];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(target, 0, removed);
    reorderMutation.mutate(reordered);
  }

  function confirmDelete(board: Board) {
    setBoardToDelete(board);
    setDeleteDialogOpen(true);
  }

  function executeDelete() {
    if (!boardToDelete) return;
    deleteMutation.mutate(boardToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setBoardToDelete(null);
      },
    });
  }

  if (boardsQuery.isLoading) {
    return (
      <div className="flex justify-center py-12 text-neutral-500 dark:text-neutral-400">
        Loading boards…
      </div>
    );
  }

  const ordered = [...boards].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Rename boards, set the default, reorder, export to JSON, or delete. The default board cannot be deleted.
      </p>

      <ul className="space-y-2">
        {ordered.map((board, index) => {
          const stats = statsByBoard[board.id];
          const onlyBoard = ordered.length <= 1;
          const canDelete = !onlyBoard && !board.isDefault;
          const wording = board.jiraEnabled ? 'tickets' : 'tasks';
          return (
            <li
              key={board.id}
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {editingId === board.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[8rem] px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const name = editName.trim();
                        if (name) {
                          renameMutation.mutate(
                            { boardId: board.id, name },
                            { onSuccess: () => setEditingId(null) },
                          );
                        }
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 flex-1 min-w-0 truncate">
                    {board.name}
                  </span>
                )}
                <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                  <input
                    type="radio"
                    name="default-board"
                    checked={board.isDefault}
                    onChange={() => setDefaultMutation.mutate(board.id)}
                    className="rounded border-neutral-300 dark:border-neutral-600"
                  />
                  Default
                </label>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0 || reorderMutation.isPending}
                    className="p-1 rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30"
                    onClick={() => handleMove(board.id, -1)}
                  >
                    <ChevronUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={index === ordered.length - 1 || reorderMutation.isPending}
                    className="p-1 rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30"
                    onClick={() => handleMove(board.id, 1)}
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </div>
                {editingId === board.id ? (
                  <button
                    type="button"
                    className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Save name"
                    disabled={!editName.trim()}
                    onClick={() => {
                      const name = editName.trim();
                      if (!name) return;
                      renameMutation.mutate(
                        { boardId: board.id, name },
                        { onSuccess: () => setEditingId(null) },
                      );
                    }}
                  >
                    <Check className="size-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="p-1.5 rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    title="Rename"
                    onClick={() => {
                      setEditingId(board.id);
                      setEditName(board.name);
                    }}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className="p-1.5 rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-40"
                  title="Export JSON"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate(board.id)}
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
                  title={canDelete ? 'Delete board' : 'Cannot delete default or only board'}
                  disabled={!canDelete || deleteMutation.isPending}
                  onClick={() => canDelete && confirmDelete(board)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {stats && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
                  {stats.columnCount} columns · {stats.ticketCount} {wording}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <Dialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete board?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {boardToDelete
                ? `This will permanently delete "${boardToDelete.name}" and all of its columns and items. This cannot be undone.`
                : null}
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleteMutation.isPending}
                onClick={executeDelete}
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
