import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRightLeft,
  ChevronRight,
  Clock,
  Eye,
  MoreVertical,
  Play,
  Trash2,
} from "lucide-react";
import { TicketAttachmentCount } from "@/components/TicketAttachmentCount";
import { TicketCoverImage } from "@/components/TicketCoverImage";
import { TicketSubtaskCount } from "@/components/TicketSubtaskCount";
import { useEffect, useState } from "react";
import type { Ticket } from "@/db/database";
import { registerTicket, unregisterTicket } from "@/contexts/ticketRegistry";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import {
  formatDueDate,
  getDueDateTone,
  getTicketAttachmentCount,
  getTicketCoverImage,
  getTicketSubtaskCount,
  type DueDateTone,
} from "@/modules/tickets";
import { stripHtml } from "@/utils/sanitizeHtml";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export interface MoveTarget {
  id: string;
  title: string;
}

const DUE_DATE_TONE_CLASS: Record<DueDateTone, string> = {
  urgent: "text-rose-500 dark:text-rose-400",
  soon: "text-amber-500 dark:text-amber-400",
  normal: "text-neutral-500 dark:text-neutral-400",
};

interface TicketCardProps {
  readonly ticket: Ticket;
  readonly allowReorderInColumn?: boolean;
  readonly moveTargets?: readonly MoveTarget[];
  readonly onMove?: (ticketId: string, columnId: string) => void;
  readonly onDelete?: (ticketId: string) => void;
  readonly deleting?: boolean;
  readonly onStartFocus?: (ticket: Ticket) => void;
  readonly focusActive?: boolean;
  readonly focusedTicketId?: string;
}

export function TicketCard({
  ticket,
  allowReorderInColumn = true,
  moveTargets,
  onMove,
  onDelete,
  deleting = false,
  onStartFocus,
  focusActive = false,
  focusedTicketId,
}: TicketCardProps) {
  const { openTicketDetail } = useTicketDetail();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    registerTicket(ticket);
    return () => unregisterTicket(ticket.id);
  }, [ticket.id, ticket]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: {
      type: "ticket" as const,
      columnId: ticket.columnId,
      allowReorderInColumn,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showFocus = Boolean(onStartFocus && !focusActive);
  const showMenu = Boolean(moveTargets && (onMove || onDelete)) || showFocus;
  const moveDestinations =
    showMenu && moveTargets
      ? moveTargets.filter((t) => t.id !== ticket.columnId)
      : [];
  const isFocusedTicket = focusedTicketId === ticket.id;
  const formattedDueDate = formatDueDate(ticket.dueDate, { compact: true });
  const dueDateTone = getDueDateTone(ticket.dueDate) ?? "normal";
  const cover = getTicketCoverImage(ticket);
  const attachmentCount = getTicketAttachmentCount(ticket);
  const subtaskCount = getTicketSubtaskCount(ticket);

  const sortableHandleProps = { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 mb-2 hover:shadow-md transition-shadow flex flex-col cursor-move overflow-hidden ${
        isFocusedTicket
          ? "after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-lg after:border-2 after:border-amber-400 dark:after:border-amber-500"
          : ""
      }`}
      {...sortableHandleProps}
    >
      {cover && (
        <TicketCoverImage
          src={cover.src}
          alt={cover.alt}
          className="h-36 w-full"
        />
      )}
      <div className="p-3">
          {showMenu && (
            <div className="float-right -mr-1 -mt-1 ml-2 flex items-center">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                      aria-label="Ticket options"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="size-4" aria-hidden />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-[60] min-w-[10rem] rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1 shadow-lg"
                      side="right"
                      sideOffset={8}
                      align="start"
                    >
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700 outline-none"
                        onSelect={() => openTicketDetail(ticket)}
                      >
                        <Eye className="size-3.5" aria-hidden />
                        View details
                      </DropdownMenu.Item>
                      {showFocus && (
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700 outline-none"
                          onSelect={() => onStartFocus?.(ticket)}
                        >
                          <Play className="size-3.5" aria-hidden />
                          Start focused work session
                        </DropdownMenu.Item>
                      )}
                      {onMove && moveDestinations.length > 0 && (
                        <DropdownMenu.Sub>
                          <DropdownMenu.SubTrigger className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700 outline-none">
                            <span className="flex items-center gap-2">
                              <ArrowRightLeft className="size-3.5" aria-hidden />
                              Move to…
                            </span>
                            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                          </DropdownMenu.SubTrigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.SubContent
                              className="z-[60] min-w-[10rem] rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1 shadow-lg"
                              sideOffset={4}
                              avoidCollisions={false}
                            >
                              {moveDestinations.map((dest) => (
                                <DropdownMenu.Item
                                  key={dest.id}
                                  className="px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700 outline-none"
                                  onSelect={() => onMove(ticket.id, dest.id)}
                                >
                                  {dest.title}
                                </DropdownMenu.Item>
                              ))}
                            </DropdownMenu.SubContent>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Sub>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 cursor-pointer data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/40 outline-none disabled:opacity-60"
                            disabled={deleting}
                            onSelect={(event) => {
                              event.preventDefault();
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Delete
                          </DropdownMenu.Item>
                        </>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
          )}
          <button
            type="button"
            className="block cursor-move text-left text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors break-words line-clamp-4"
            onDoubleClick={(e) => {
              e.stopPropagation();
              openTicketDetail(ticket);
            }}
          >
            {ticket.title}
          </button>
          {ticket.description && typeof ticket.description === "string" && (
            <p className="clear-both text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
              {stripHtml(ticket.description)}
            </p>
          )}
          {ticket.type === "jira" && ticket.jiraData && (
            <div className="clear-both mt-2 flex items-center flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded break-words whitespace-normal max-w-full">
                {ticket.jiraData.jiraKey}
              </span>
              {ticket.jiraData.status && (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-medium break-words whitespace-normal max-w-full">
                  {ticket.jiraData.status}
                </span>
              )}
              {ticket.jiraData.priority && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium break-words whitespace-normal max-w-full">
                  {ticket.jiraData.priority}
                </span>
              )}
            </div>
          )}
          {ticket.type === "local" && ticket.customKey && (
            <div className="clear-both mt-2 flex items-start flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded break-words whitespace-normal max-w-full">
                {ticket.customKey}
              </span>
              {ticket.priority && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium break-words whitespace-normal max-w-full">
                  {ticket.priority}
                </span>
              )}
            </div>
          )}
          {ticket.type === "local" && !ticket.customKey && ticket.priority && (
            <div className="clear-both mt-2 flex items-start flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium break-words whitespace-normal max-w-full">
                {ticket.priority}
              </span>
            </div>
          )}

      {(attachmentCount > 0 || subtaskCount > 0 || formattedDueDate) && (
        <div className="clear-both flex items-center gap-3 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
          {attachmentCount > 0 && <TicketAttachmentCount count={attachmentCount} />}
          {subtaskCount > 0 && <TicketSubtaskCount count={subtaskCount} />}
          {formattedDueDate && (
            <span
              className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${DUE_DATE_TONE_CLASS[dueDateTone]}`}
              title={`Due ${formattedDueDate}`}
            >
              <Clock className="size-3.5" aria-hidden />
              {formattedDueDate}
            </span>
          )}
        </div>
      )}

      {onDelete && (
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete ticket?"
          description={`"${ticket.title}" will be permanently deleted.`}
          loading={deleting}
          onConfirm={() => {
            onDelete(ticket.id);
            setDeleteDialogOpen(false);
          }}
        />
      )}
      </div>
    </div>
  );
}
