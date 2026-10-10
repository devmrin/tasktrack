import type { Ticket } from '@/db/database';

export function ticketDisplayKey(ticket: Ticket): string {
  if (ticket.type === 'jira' && ticket.jiraData?.jiraKey) {
    return ticket.jiraData.jiraKey;
  }
  return ticket.customKey ?? '';
}
