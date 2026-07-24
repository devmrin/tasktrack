import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import {
  createBoard as createBoardSvc,
  deleteBoard as deleteBoardSvc,
  exportBoard as exportBoardSvc,
  listBoards,
  renameBoard as renameBoardSvc,
  reorderBoards as reorderBoardsSvc,
  setBoardJiraEnabled,
  setBoardFieldVisibility,
  setDefaultBoard as setDefaultBoardSvc,
} from '@/modules/boards/services/board.service';
import { ACTIVE_BOARD_STORAGE_KEY } from '@/modules/boards/constants/board.constants';
import { useToast } from '@/hooks/useToast';

export function useBoardsQuery() {
  return useQuery({
    queryKey: queryKeys.boards,
    queryFn: listBoards,
  });
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function syncActiveBoardStorageAfterDelete(deletedBoardId: string) {
  try {
    const raw = globalThis.localStorage.getItem(ACTIVE_BOARD_STORAGE_KEY);
    if (raw === null) {
      return;
    }
    const parsed = JSON.parse(raw) as string;
    if (parsed !== deletedBoardId) {
      return;
    }
    void listBoards().then((nextBoards) => {
      const fallback = nextBoards.find((b) => b.isDefault) ?? nextBoards[0];
      if (fallback) {
        globalThis.localStorage.setItem(ACTIVE_BOARD_STORAGE_KEY, JSON.stringify(fallback.id));
      } else {
        globalThis.localStorage.removeItem(ACTIVE_BOARD_STORAGE_KEY);
      }
    });
  } catch {
    // ignore
  }
}

export function useCreateBoardMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (name: string) => createBoardSvc(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('Board created');
    },
    onError: () => {
      showToast('Failed to create board');
    },
  });
}

export function useRenameBoardMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) =>
      renameBoardSvc(boardId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      showToast('Board renamed');
    },
    onError: () => {
      showToast('Failed to rename board');
    },
  });
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (boardId: string) => deleteBoardSvc(boardId),
    onSuccess: (_void, deletedBoardId) => {
      syncActiveBoardStorageAfterDelete(deletedBoardId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['columns'] });
      showToast('Board deleted');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to delete board');
    },
  });
}

export function useSetDefaultBoardMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (boardId: string) => setDefaultBoardSvc(boardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      showToast('Default board updated');
    },
    onError: () => {
      showToast('Failed to set default board');
    },
  });
}

export function useReorderBoardsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderBoardsSvc(orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
}

export function useSetBoardJiraEnabledMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ boardId, enabled }: { boardId: string; enabled: boolean }) =>
      setBoardJiraEnabled(boardId, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      showToast('Board settings updated');
    },
    onError: () => {
      showToast('Failed to update board');
    },
  });
}

export function useSetBoardFieldVisibilityMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ boardId, field, enabled }: { boardId: string; field: 'showPriority' | 'showDueDate'; enabled: boolean }) =>
      setBoardFieldVisibility(boardId, field, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      showToast('Board settings updated');
    },
    onError: () => showToast('Failed to update board'),
  });
}

export function useExportBoardMutation() {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const payload = await exportBoardSvc(boardId);
      const safeName =
        typeof payload.board.name === 'string' && payload.board.name.trim()
          ? payload.board.name
              .trim()
              .replaceAll(/[^\w\s-]/g, '')
              .replaceAll(/\s+/g, '-')
              .slice(0, 48)
          : 'board';
      downloadJson(`tasktrack-${safeName}-${Date.now()}.json`, payload);
    },
    onSuccess: () => {
      showToast('Board exported');
    },
    onError: () => {
      showToast('Failed to export board');
    },
  });
}
