import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { resolveBoardFromSlugParam } from '@/modules/boards/utils/boardSlug';
import type { BoardView } from '@/modules/workspace/types';

/**
 * Syncs URL boardSlug → activeBoardId, and redirects when the slug is unknown
 * or when rename updated the stored slug (canonical redirect).
 */
export function useBoardSlugSync(boardSlug: string, view: BoardView): void {
  const navigate = useNavigate();
  const { boards, activeBoardId, setActiveBoardId, isLoading } = useActiveBoard();

  const resolved = useMemo(
    () => resolveBoardFromSlugParam(boards, boardSlug),
    [boards, boardSlug],
  );

  useEffect(() => {
    if (isLoading || boards.length === 0) {
      return;
    }

    if (!resolved) {
      const fallback = boards.find((b) => b.isDefault) ?? boards[0];
      if (!fallback) {
        return;
      }
      void navigate({
        to: '/$boardSlug/$view',
        params: { boardSlug: fallback.slug, view },
        replace: true,
      });
      return;
    }

    if (resolved.id !== activeBoardId) {
      setActiveBoardId(resolved.id);
    }

    if (resolved.slug !== boardSlug) {
      void navigate({
        to: '/$boardSlug/$view',
        params: { boardSlug: resolved.slug, view },
        replace: true,
      });
    }
  }, [
    isLoading,
    boards,
    resolved,
    activeBoardId,
    setActiveBoardId,
    boardSlug,
    view,
    navigate,
  ]);
}
