import { useMemo } from 'react';
import type { Ticket } from '@/db/database';
import { useStatusFilter } from '@/hooks/useStatusFilter';
import { useActiveBoard } from '@/modules/boards';
import { INBOX_COLUMN_ID } from '@/modules/inbox';
import { useColumnsQuery } from '@/modules/kanban';
import { ticketDisplayKey } from '@/modules/list/utils/ticketDisplayKey';
import {
  ticketMatchesStatusFilter,
  useAllTicketsQuery,
} from '@/modules/tickets';

export interface BoardListRow {
  readonly ticket: Ticket;
  readonly key: string;
  readonly title: string;
  readonly columnTitle: string;
  readonly status: string;
  readonly assignee: string;
  readonly priority: string;
  readonly dueDate: string | undefined;
  readonly updatedAt: number;
  readonly createdAt: number;
  readonly type: Ticket['type'];
}

export function useBoardListRows(): {
  readonly rows: BoardListRow[];
  readonly loading: boolean;
  readonly showPriority: boolean;
  readonly showDueDate: boolean;
} {
  const { activeBoard, activeBoardId } = useActiveBoard();
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const columnsQuery = useColumnsQuery(activeBoardId);
  const statusFilter = useStatusFilter();

  const columnTitleById = useMemo(() => {
    const map = new Map<string, string>();
    map.set(INBOX_COLUMN_ID, 'Inbox');
    for (const column of columnsQuery.data ?? []) {
      map.set(column.id, column.title);
    }
    return map;
  }, [columnsQuery.data]);

  const rows = useMemo(() => {
    const tickets = ticketsQuery.data ?? [];
    const boardColumnIds = new Set((columnsQuery.data ?? []).map((c) => c.id));

    return tickets
      .filter((ticket) => boardColumnIds.has(ticket.columnId))
      .filter((ticket) => ticketMatchesStatusFilter(ticket, statusFilter.filter))
      .map((ticket): BoardListRow => ({
        ticket,
        key: ticketDisplayKey(ticket),
        title: ticket.title,
        columnTitle: columnTitleById.get(ticket.columnId) ?? '—',
        status: ticket.jiraData?.status?.trim() || '—',
        assignee: ticket.jiraData?.assignee?.trim() || 'Unassigned',
        priority: ticket.priority ?? 'None',
        dueDate: ticket.dueDate,
        updatedAt: ticket.updatedAt,
        createdAt: ticket.createdAt,
        type: ticket.type,
      }));
  }, [ticketsQuery.data, columnsQuery.data, columnTitleById, statusFilter.filter]);

  return {
    rows,
    loading: ticketsQuery.isLoading || columnsQuery.isLoading,
    showPriority: activeBoard?.showPriority ?? true,
    showDueDate: activeBoard?.showDueDate ?? true,
  };
}
