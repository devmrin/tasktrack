import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { Ticket } from "@/db/database";
import { queryKeys } from "@/hooks/queryKeys";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import { useBoardTerminology } from "@/modules/boards/hooks/useBoardTerminology";
import { INBOX_COLUMN_ID } from "@/modules/inbox/types";
import { getAllColumns, getColumn, reorderColumns } from "@/modules/kanban";
import {
  getTicket,
  moveTicket,
  reorderTicketInColumn,
} from "@/modules/tickets";
import type { Column } from "@/modules/kanban";
import { getTicketById } from "@/contexts/ticketRegistry";
import { stripHtml } from "@/utils/sanitizeHtml";

interface DndProviderProps {
  readonly children: React.ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const queryClient = useQueryClient();
  const { activeBoardId, activeBoard } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeColumnDragId, setActiveColumnDragId] = useState<string | null>(
    null,
  );
  const [activeDragType, setActiveDragType] = useState<
    "ticket" | "column" | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const dragType = args.active.data.current?.type as
      | "ticket"
      | "column"
      | undefined;

    if (dragType === "column") {
      if (!activeBoardId) return closestCenter(args);
      const cachedColumns =
        queryClient.getQueryData<Column[]>(queryKeys.columns(activeBoardId)) ?? [];
      const columnIds = new Set(cachedColumns.map((column) => column.id));
      const columnContainers = args.droppableContainers.filter(
        (container) => columnIds.has(String(container.id)),
      );
      if (columnContainers.length === 0) {
        return closestCenter(args);
      }
      return closestCenter({
        ...args,
        droppableContainers: columnContainers,
      });
    }

    return rectIntersection(args);
  }, [queryClient, activeBoardId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    const dragType = event.active.data.current?.type as
      | "ticket"
      | "column"
      | undefined;

    if (dragType === "column") {
      setActiveDragType("column");
      setActiveId(null);
      setActiveColumnId(null);
      setActiveColumnDragId(id);
      return;
    }

    const ticket = getTicketById(id);
    const ticketColumnId =
      (event.active.data.current?.columnId as string | undefined) ??
      ticket?.columnId ??
      null;
    setActiveDragType("ticket");
    setActiveId(id);
    setActiveColumnId(ticketColumnId);
    setActiveColumnDragId(null);
  }, []);

  const resolveDropTarget = useCallback(
    async (
      overId: string,
      sourceColumnId: string | null,
    ): Promise<{
      columnId: string;
      targetTicketId?: string;
    } | null> => {
      const targetTicket = getTicketById(overId);
      if (targetTicket) {
        return {
          columnId: targetTicket.columnId,
          targetTicketId: targetTicket.id,
        };
      }

      if (overId === INBOX_COLUMN_ID) {
        return { columnId: INBOX_COLUMN_ID };
      }

      const targetColumn = await getColumn(overId);
      if (targetColumn) {
        return { columnId: targetColumn.id };
      }

      if (sourceColumnId) {
        const overTicket = await getTicket(overId);
        if (overTicket) {
          return {
            columnId: overTicket.columnId,
            targetTicketId: overTicket.id,
          };
        }
      }

      return null;
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const draggedColumnId = activeColumnId;
      const dragType = activeDragType;
      setActiveId(null);
      setActiveColumnId(null);
      setActiveColumnDragId(null);
      setActiveDragType(null);

      if (!over) return;

      const activeEntityId = active.id as string;
      const overId = over.id as string;
      if (activeEntityId === overId) return;

      if (dragType === "column") {
        void (async () => {
          if (!activeBoardId) return;
          const cachedColumns = queryClient.getQueryData<Column[]>(
            queryKeys.columns(activeBoardId),
          );
          const availableColumns = cachedColumns ?? (await getAllColumns(activeBoardId));
          const orderedColumnIds = [...availableColumns]
            .sort((a, b) => a.order - b.order)
            .map((column) => column.id);
          let targetColumnId = overId;
          if (!orderedColumnIds.includes(targetColumnId)) {
            const overTicket =
              getTicketById(overId) ?? (await getTicket(overId));
            targetColumnId = overTicket?.columnId ?? overId;
          }
          const oldIndex = orderedColumnIds.indexOf(activeEntityId);
          const newIndex = orderedColumnIds.indexOf(targetColumnId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
            return;
          }

          await reorderColumns(arrayMove(orderedColumnIds, oldIndex, newIndex));
          queryClient.invalidateQueries({ queryKey: queryKeys.columns(activeBoardId) });
        })();
        return;
      }

      void (async () => {
        const dropTarget = await resolveDropTarget(overId, draggedColumnId);
        if (!dropTarget) return;

        const { targetTicketId } = dropTarget;
        const canReorderInSourceColumn =
          (active.data.current?.allowReorderInColumn as boolean | undefined) ??
          true;
        const isSameColumnReorder =
          draggedColumnId === dropTarget.columnId && targetTicketId;

        if (isSameColumnReorder) {
          if (!canReorderInSourceColumn) {
            return;
          }
          await reorderTicketInColumn(
            activeEntityId,
            targetTicketId,
            dropTarget.columnId,
          );
        } else {
          await moveTicket(
            activeEntityId,
            dropTarget.columnId,
            dropTarget.targetTicketId,
          );
        }

        if (activeBoardId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(activeBoardId) });
        } else {
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      })();
    },
    [activeBoardId, activeColumnId, activeDragType, queryClient, resolveDropTarget],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveColumnId(null);
    setActiveColumnDragId(null);
    setActiveDragType(null);
  }, []);

  const activeTicket = activeId ? getTicketById(activeId) : null;
  const cachedColumns =
    activeBoardId !== undefined && activeBoardId !== null
      ? queryClient.getQueryData<Column[]>(queryKeys.columns(activeBoardId)) ?? []
      : [];
  const cachedTickets =
    activeBoardId !== undefined && activeBoardId !== null
      ? queryClient.getQueryData<Ticket[]>(queryKeys.tickets.all(activeBoardId)) ?? []
      : [];
  const activeColumn =
    activeDragType === "column" && activeColumnDragId
      ? (cachedColumns.find((column) => column.id === activeColumnDragId) ??
        null)
      : null;
  const activeColumnTickets = activeColumn
    ? cachedTickets
        .filter((ticket) => ticket.columnId === activeColumn.id && ticket.boardId === activeBoardId)
        .sort((a, b) => a.order - b.order)
    : [];
  let overlayContent: React.ReactNode = null;
  if (activeTicket) {
    overlayContent = (
      <div className="rotate-3 opacity-90 w-72">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-3">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-4">
            {activeTicket.title}
          </p>
          {activeTicket.description &&
            typeof activeTicket.description === "string" && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                {stripHtml(activeTicket.description)}
              </p>
            )}
        </div>
      </div>
    );
  } else if (activeColumn) {
    overlayContent = (
      <div className="w-72 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 shadow-xl opacity-90">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {activeColumn.title}
          </h2>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {`${activeColumnTickets.length} ${terminology.items}`}
          </div>
        </div>
        <div className="min-h-[8rem] rounded-md border-2 border-dashed border-neutral-200/60 dark:border-neutral-600/60 p-2">
          {activeColumnTickets.slice(0, 4).map((ticket) => (
            <div
              key={ticket.id}
              className="mb-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3"
            >
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {ticket.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>{overlayContent}</DragOverlay>
    </DndContext>
  );
}
