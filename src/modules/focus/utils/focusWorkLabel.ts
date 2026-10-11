import type { Ticket } from '@/db/database';
import type { FocusedData } from '@/modules/focus/types';
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

/** Work-phase label for a ticket or custom focus session. */
export function getFocusedSessionWorkLabel(focused: FocusedData): string {
  if (focused.kind === 'custom') {
    const label = focused.label.trim().replace(/\s+/g, ' ');
    return label || FALLBACK_WORK_LABEL;
  }
  return getFocusWorkLabel(focused.ticket);
}
