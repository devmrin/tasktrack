import { Tooltip } from "@/components/Tooltip";
import type { Ticket } from "@/db/database";
import { SanitizedHtml } from "@/modules/kanban/components/SanitizedHtml";
import { formatDueDate } from "@/modules/tickets";

interface FocusTicketCardProps {
  readonly ticket: Ticket;
  readonly onDismiss: () => void;
}

export function FocusTicketCard({ ticket, onDismiss }: FocusTicketCardProps) {
  const formattedDueDate = formatDueDate(ticket.dueDate);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="order-2 lg:order-1 shrink-0 mt-3 lg:mt-0">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-4">
          {ticket.title}
        </h3>
        {ticket.type === "jira" && ticket.jiraData && (
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
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
            {formattedDueDate && (
              <span className="text-xs px-2 py-0.5 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded font-medium break-words whitespace-normal max-w-full">
                Due {formattedDueDate}
              </span>
            )}
          </div>
        )}
        {ticket.type === "local" && ticket.customKey && (
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded break-words whitespace-normal max-w-full">
              {ticket.customKey}
            </span>
            {ticket.priority && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium break-words whitespace-normal max-w-full">
                {ticket.priority}
              </span>
            )}
            {formattedDueDate && (
              <span className="text-xs px-2 py-0.5 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded font-medium break-words whitespace-normal max-w-full">
                Due {formattedDueDate}
              </span>
            )}
          </div>
        )}
        {ticket.type === "local" && !ticket.customKey && (ticket.priority || formattedDueDate) && (
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
            {ticket.priority && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium break-words whitespace-normal max-w-full">
                {ticket.priority}
              </span>
            )}
            {formattedDueDate && (
              <span className="text-xs px-2 py-0.5 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded font-medium break-words whitespace-normal max-w-full">
                Due {formattedDueDate}
              </span>
            )}
          </div>
        )}
      </div>

      {ticket.description && typeof ticket.description === "string" && (
        <div className="order-3 lg:order-2 flex-1 min-h-0 mt-3 lg:mt-2 overflow-y-auto">
          <SanitizedHtml
            html={ticket.description}
            className="text-sm text-neutral-600 dark:text-neutral-400 ticket-description-content"
          />
        </div>
      )}

      <div className="order-1 lg:order-3 mt-4 lg:mt-0 flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-700 lg:border-b-0 lg:border-t lg:pb-0 lg:pt-3">
        <Tooltip content="Returns to column">
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            Dismiss
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
