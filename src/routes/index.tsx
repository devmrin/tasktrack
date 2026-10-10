import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';

export const Route = createFileRoute('/')({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { activeBoard, isLoading } = useActiveBoard();

  if (isLoading || !activeBoard?.slug) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <Navigate
      to="/$boardSlug/$view"
      params={{ boardSlug: activeBoard.slug, view: 'board' }}
      replace
    />
  );
}
