import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { useJiraSyncMutation } from '@/modules/inbox/hooks/useJiraSyncMutation';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import {
  useAtlassianConfigQuery,
  useOAuthCompleteMutation,
} from '@/modules/settings/hooks/useAtlassianQuery';

/** Prevents duplicate token exchange (e.g. React Strict Mode double-mount). */
let oauthRedirectCodeInFlight: string | null = null;

function clearOAuthSearchParams(): void {
  globalThis.history.replaceState({}, '', globalThis.location.pathname);
}

export function useAtlassianOAuthRedirectHandler(): void {
  const configQuery = useAtlassianConfigQuery();
  const oauthCompleteMutation = useOAuthCompleteMutation();
  const { activeBoardId } = useActiveBoard();
  const jiraSyncMutation = useJiraSyncMutation(activeBoardId);
  const { showToast } = useToast();
  const syncStartedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const code = params.get('code');
    if (!code) {
      oauthRedirectCodeInFlight = null;
      syncStartedRef.current = false;
      return;
    }

    const config = configQuery.data;
    if (configQuery.isLoading) {
      return;
    }
    if (!config) {
      showToast('Save your JIRA OAuth configuration before connecting');
      clearOAuthSearchParams();
      oauthRedirectCodeInFlight = null;
      return;
    }

    if (oauthRedirectCodeInFlight === code) {
      return;
    }
    oauthRedirectCodeInFlight = code;

    oauthCompleteMutation.mutate(
      { code, state: params.get('state'), config },
      {
        onSuccess: () => {
          if (syncStartedRef.current) {
            return;
          }
          syncStartedRef.current = true;
          jiraSyncMutation.mutate(undefined, {
            onSuccess: (result) => {
              const total =
                (result?.created.length ?? 0) + (result?.updated.length ?? 0);
              showToast(
                total > 0
                  ? `Connected to JIRA — fetched ${total} tickets`
                  : 'Connected to JIRA',
              );
              clearOAuthSearchParams();
            },
            onError: () => {
              showToast('Connected to JIRA');
              clearOAuthSearchParams();
            },
          });
        },
        onError: (err) => {
          oauthRedirectCodeInFlight = null;
          syncStartedRef.current = false;
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to complete OAuth flow';
          showToast(message);
          clearOAuthSearchParams();
        },
      },
    );
  }, [
    configQuery.data,
    configQuery.isLoading,
    jiraSyncMutation,
    oauthCompleteMutation,
    showToast,
  ]);
}
