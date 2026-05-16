import type { Ticket } from '@/db/database';
import { isValidTicketKey } from '@/modules/tickets';
import { stripHtml } from '@/utils/sanitizeHtml';

const FALLBACK_WORK_LABEL = 'Time to focus!';

/** Plain label for Pomodoro work phase: JIRA key when present, else ticket title. */
export function getFocusWorkLabel(ticket: Ticket): string {
  const jiraKey = ticket.jiraData?.jiraKey?.trim();
  if (jiraKey) return jiraKey;

  const custom = ticket.customKey?.trim();
  if (custom && isValidTicketKey(custom.toUpperCase())) {
    return custom.toUpperCase();
  }

  const plainTitle = stripHtml(ticket.title).trim().replace(/\s+/g, ' ');
  if (plainTitle) return plainTitle;

  return FALLBACK_WORK_LABEL;
}
