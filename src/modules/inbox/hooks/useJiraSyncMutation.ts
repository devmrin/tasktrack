import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { useToast } from '@/hooks/useToast';
import { fetchJiraTickets } from '@/modules/inbox/services/jira.service';

export function useJiraSyncMutation(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (jql?: string) => {
      if (!boardId) {
        throw new Error('Board not ready');
      }
      return fetchJiraTickets(jql, boardId);
    },
    onSuccess: () => {
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(boardId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira(boardId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
    onError: () => {
      showToast('JIRA sync failed. Please check your connection and try again.');
    },
  });
}
