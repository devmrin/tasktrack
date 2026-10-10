import { createFileRoute, redirect } from '@tanstack/react-router';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { KanbanBoard, StatusFilter } from '@/modules/kanban';
import { TicketListView } from '@/modules/list';
import { BoardSummaryView } from '@/modules/summary';
import {
  BoardWorkspaceLayout,
  isBoardView,
  useBoardSlugSync,
  type BoardView,
} from '@/modules/workspace';

export const Route = createFileRoute('/$boardSlug/$view')({
  beforeLoad: ({ params }) => {
    if (!isBoardView(params.view)) {
      throw redirect({
        to: '/$boardSlug/$view',
        params: { boardSlug: params.boardSlug, view: 'board' },
        replace: true,
      });
    }
  },
  component: BoardWorkspaceRoute,
});

function BoardWorkspaceRoute() {
  const { boardSlug, view: viewParam } = Route.useParams();
  const view = viewParam as BoardView;
  const { activeBoard } = useActiveBoard();

  useBoardSlugSync(boardSlug, view);

  const toolbarEnd = <StatusFilter key={activeBoard?.id} />;

  return (
    <BoardWorkspaceLayout boardSlug={boardSlug} view={view} toolbarEnd={toolbarEnd}>
      {view === 'summary' && <BoardSummaryView />}
      {view === 'list' && <TicketListView />}
      {view === 'board' && <KanbanBoard />}
    </BoardWorkspaceLayout>
  );
}
