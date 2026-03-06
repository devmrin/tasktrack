import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { useToast } from '@/hooks/useToast';
import { fetchJiraTickets } from '@/modules/inbox/services/jira.service';

export function useJiraSyncMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (jql?: string) => fetchJiraTickets(jql),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.jira });
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
    onError: () => {
      showToast('JIRA sync failed. Please check your connection and try again.');
    },
  });
}
