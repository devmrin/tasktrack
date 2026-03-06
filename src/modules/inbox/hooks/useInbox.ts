import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import type { JiraSyncResult } from '@/modules/inbox/services/jira.service';
import { useAtlassianConnectionQuery } from '@/modules/settings/hooks/useAtlassianQuery';
import {
  useCreateTicketMutation,
  useDeleteTicketMutation,
  useJiraTicketsQuery,
  useMoveTicketMutation,
  useUpdateTicketMutation,
} from '@/modules/tickets/hooks/useTicketsQuery';
import { useInboxTicketsQuery } from '@/modules/inbox/hooks/useInboxTicketsQuery';
import { useJiraSyncMutation } from '@/modules/inbox/hooks/useJiraSyncMutation';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import type { TicketPriority } from '@/modules/tickets';

export function useInbox() {
  const queryClient = useQueryClient();
  const inboxQuery = useInboxTicketsQuery();
  const connectionQuery = useAtlassianConnectionQuery();
  const jiraTicketsQuery = useJiraTicketsQuery();
  const moveTicketMutation = useMoveTicketMutation();
  const updateTicketMutation = useUpdateTicketMutation();
  const deleteTicketMutation = useDeleteTicketMutation();
  const createTicketMutation = useCreateTicketMutation();
  const jiraSyncMutation = useJiraSyncMutation();

  const inboxTickets = inboxQuery.data ?? [];
  const loading = inboxQuery.isLoading;
  const jiraConnected = !!connectionQuery.data;
  const hasJiraTicketsInDb = (jiraTicketsQuery.data?.length ?? 0) > 0;
  const syncing = jiraSyncMutation.isPending;
  const adding = createTicketMutation.isPending;

  const moveTicketToColumn = (ticketId: string, columnId: string) => {
    moveTicketMutation.mutate({ ticketId, newColumnId: columnId });
  };

  const handleTicketUpdate = (
    ticketId: string,
    updates: { title?: string; description?: string; priority?: TicketPriority }
  ) => {
    updateTicketMutation.mutate({ id: ticketId, updates });
  };

  const handleTicketDelete = (ticketId: string) => {
    deleteTicketMutation.mutate(ticketId);
  };

  const jiraTickets = jiraTicketsQuery.data ?? [];

  const addTicketToInbox = (
    title: string,
    description?: string,
    customKey?: string,
    priority?: TicketPriority,
    dueDate?: string,
    onSuccess?: () => void
  ) => {
    createTicketMutation.mutate(
      {
        title,
        description,
        priority,
        type: 'local',
        columnId: INBOX_COLUMN_ID,
        customKey,
        dueDate,
      },
      { onSuccess }
    );
  };

  const syncFromJira = (onSuccess?: (result: JiraSyncResult) => void) => {
    jiraSyncMutation.mutate(undefined, { onSuccess });
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.inbox });
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
  };

  const refreshJiraTicketsInDb = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira });
  };

  return {
    inboxTickets,
    loading,
    jiraConnected,
    hasJiraTicketsInDb,
    jiraTickets,
    syncing,
    adding,
    moveTicketToColumn,
    handleTicketUpdate,
    handleTicketDelete,
    deletingTicket: deleteTicketMutation.isPending,
    addTicketToInbox,
    syncFromJira,
    refresh,
    refreshJiraTicketsInDb,
  };
}
