import { useQueryClient } from "@tanstack/react-query";
import { Form, Formik, type FormikHelpers } from "formik";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, HelpCircle, ExternalLink } from "lucide-react";
import { queryKeys } from "@/hooks/queryKeys";
import {
  initiateOAuthFlow,
  type AtlassianConfig,
} from "@/modules/settings/services/atlassian.service";
import {
  useAtlassianConfigQuery,
  useAtlassianConnectionQuery,
  useClearAtlassianTokensMutation,
  useOAuthCompleteMutation,
  useSaveAtlassianConfigMutation,
} from "@/modules/settings/hooks/useAtlassianQuery";
import { useJiraSyncMutation } from "@/modules/inbox/hooks/useJiraSyncMutation";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import { useBoardsQuery } from "@/modules/boards/hooks/useBoardsQuery";
import { setBoardJiraEnabled } from "@/modules/boards/services/board.service";
import { useToast } from "@/hooks/useToast";
import { useSettingsDialogFooter } from "@/contexts/settings-dialog-footer-context";
import { Tooltip } from "@/components/Tooltip";

const JIRA_SETTINGS_FORM_ID = "jira-settings-form";

interface JiraSettingsFormValues {
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
  boardJiraEnabled: Record<string, boolean>;
}

export function JiraSettings() {
  const configQuery = useAtlassianConfigQuery();
  const connectionQuery = useAtlassianConnectionQuery();
  const boardsQuery = useBoardsQuery();

  if (configQuery.isLoading || boardsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <JiraSettingsForm
      boards={boardsQuery.data ?? []}
      config={configQuery.data ?? null}
      isConnected={!!connectionQuery.data}
    />
  );
}

interface CopyButtonProps {
  readonly value: string;
}

function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </Tooltip>
  );
}

function JiraSetupGuide() {
  const callbackUrl = useMemo(() => globalThis.location.origin, []);

  return (
    <details className="group rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 mb-4">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 select-none list-none [&::-webkit-details-marker]:hidden">
        <HelpCircle
          className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500"
          aria-hidden
        />
        <span>How do I get my OAuth credentials?</span>
        <svg
          className="ml-auto size-4 shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>

      <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-4 text-sm text-neutral-600 dark:text-neutral-400 space-y-4">
        <div>
          <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
            1. Create your application
          </h4>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>
              Go to the{" "}
              <a
                href="https://developer.atlassian.com/console"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Atlassian Developer Console
                <ExternalLink className="size-3" aria-hidden />
              </a>{" "}
              and sign in.
            </li>
            <li>
              Click <strong>Create</strong> &rarr;{" "}
              <strong>OAuth 2.0 integration</strong>.
            </li>
            <li>Name your app (e.g. &ldquo;tasktrack&rdquo;) and confirm.</li>
          </ol>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
            2. Configure authorization &amp; scopes
          </h4>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>
              Open <strong>Authorization</strong> in the left menu, click{" "}
              <strong>Add</strong> next to &ldquo;OAuth 2.0 (3LO)&rdquo;, and
              enter your Callback URL.
            </li>
          </ol>
          <div className="mt-2">
            <div className="relative">
              <input
                type="text"
                value={callbackUrl}
                readOnly
                className="w-full px-3 py-2 pr-8 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 cursor-not-allowed"
              />
              <CopyButton value={callbackUrl} />
            </div>
          </div>
          <ol
            start={2}
            className="list-decimal list-inside space-y-1 mt-2 ml-1"
          >
            <li>
              Go to <strong>Permissions</strong> &rarr; add{" "}
              <strong>Jira API</strong> &rarr; <strong>Configure</strong>, then
              enable these scopes:
            </li>
          </ol>
          <ul className="mt-1.5 ml-5 space-y-0.5">
            <li>
              <code className="text-xs bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">
                read:jira-work
              </code>{" "}
              &mdash; view issues &amp; projects
            </li>
            <li>
              <code className="text-xs bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">
                read:jira-user
              </code>{" "}
              &mdash; view user profiles
            </li>
          </ul>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            These scopes are available under the Classic scopes section.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
            3. Retrieve your credentials
          </h4>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>
              Navigate to <strong>Settings</strong> in the left sidebar.
            </li>
            <li>
              Copy the <strong>Client ID</strong> and{" "}
              <strong>Client Secret</strong> into the fields below.
            </li>
          </ol>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Treat the Client Secret as highly sensitive &mdash; never expose it
            in client-side code or share it publicly.
          </p>
        </div>
      </div>
    </details>
  );
}

interface JiraSettingsFormProps {
  readonly boards: Array<{
    id: string;
    name: string;
    jiraEnabled: boolean;
    isDefault: boolean;
  }>;
  readonly config: AtlassianConfig | null;
  readonly isConnected: boolean;
}

function JiraBoardScopeToggles({
  boards,
  isConnected,
  onToggle,
  isDisabled,
  values,
}: {
  readonly boards: JiraSettingsFormProps["boards"];
  readonly isConnected: boolean;
  readonly onToggle: (boardId: string) => void;
  readonly isDisabled: boolean;
  readonly values: Record<string, boolean>;
}) {
  if (!isConnected || boards.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
        Boards with JIRA features
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
        Choose which boards use JIRA sync, quick open, and ticket-style linking.
      </p>
      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id} className="flex items-start gap-2">
            <input
              id={`settings-jira-board-${b.id}`}
              type="checkbox"
              className="mt-0.5 rounded border-neutral-300 dark:border-neutral-600"
              checked={values[b.id] ?? false}
              onChange={() => {
                onToggle(b.id);
              }}
              disabled={isDisabled}
            />
            <label
              htmlFor={`settings-jira-board-${b.id}`}
              className="text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              {b.name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JiraSettingsFooter({
  dirty,
  isSubmitting,
  onCancel,
}: {
  readonly dirty: boolean;
  readonly isSubmitting: boolean;
  readonly onCancel: () => void;
}) {
  const { setFooter } = useSettingsDialogFooter();

  useEffect(() => {
    if (!dirty) {
      setFooter(null);
      return undefined;
    }

    setFooter(
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          form={JIRA_SETTINGS_FORM_ID}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Check className="size-4" aria-hidden />
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </button>
      </div>,
    );

    return () => {
      setFooter(null);
    };
  }, [dirty, isSubmitting, onCancel, setFooter]);

  return null;
}

function JiraSettingsForm({
  boards,
  config,
  isConnected,
}: JiraSettingsFormProps) {
  const queryClient = useQueryClient();
  const { activeBoardId } = useActiveBoard();
  const [error, setError] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);
  const { showToast } = useToast();

  const saveConfigMutation = useSaveAtlassianConfigMutation();
  const clearTokensMutation = useClearAtlassianTokensMutation();
  const oauthCompleteMutation = useOAuthCompleteMutation();
  const jiraSyncMutation = useJiraSyncMutation(activeBoardId);

  const initialValues = useMemo<JiraSettingsFormValues>(
    () => ({
      clientId: config?.clientId ?? "",
      clientSecret: config?.clientSecret ?? "",
      instanceUrl: config?.instanceUrl ?? "",
      boardJiraEnabled: Object.fromEntries(
        boards.map((board) => [board.id, board.jiraEnabled]),
      ),
    }),
    [boards, config?.clientId, config?.clientSecret, config?.instanceUrl],
  );

  useEffect(() => {
    if (!config) return;
    const urlParams = new URLSearchParams(globalThis.location.search);
    const code = urlParams.get("code");
    if (!code || oauthHandledRef.current) return;
    oauthHandledRef.current = true;
    oauthCompleteMutation.mutate(
      { code, state: urlParams.get("state"), config },
      {
        onSuccess: () => {
          jiraSyncMutation.mutate(undefined, {
            onSuccess: (result) => {
              const total =
                (result?.created.length ?? 0) + (result?.updated.length ?? 0);
              showToast(
                total > 0
                  ? `Connected to JIRA — fetched ${total} tickets`
                  : "Connected to JIRA",
              );
              globalThis.history.replaceState({}, "", "/");
            },
            onError: () => {
              showToast("Connected to JIRA");
              globalThis.history.replaceState({}, "", "/");
            },
          });
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to complete OAuth flow",
          );
          oauthHandledRef.current = false;
        },
      },
    );
  }, [config, oauthCompleteMutation, jiraSyncMutation, showToast]);

  const handleSaveConfig = useCallback(
    async (
      values: JiraSettingsFormValues,
      { resetForm }: FormikHelpers<JiraSettingsFormValues>,
    ) => {
      setError(null);
      const newConfig: AtlassianConfig = {
        clientId: values.clientId.trim(),
        clientSecret: values.clientSecret.trim(),
        instanceUrl: values.instanceUrl.trim(),
      };
      try {
        await saveConfigMutation.mutateAsync(newConfig);

        const changedBoards = boards.filter(
          (board) =>
            (values.boardJiraEnabled[board.id] ?? false) !== board.jiraEnabled,
        );

        if (changedBoards.length > 0) {
          await Promise.all(
            changedBoards.map((board) =>
              setBoardJiraEnabled(
                board.id,
                values.boardJiraEnabled[board.id] ?? false,
              ),
            ),
          );
          await queryClient.invalidateQueries({ queryKey: queryKeys.boards });
        }

        resetForm({
          values: {
            ...values,
            boardJiraEnabled: Object.fromEntries(
              boards.map((board) => [
                board.id,
                values.boardJiraEnabled[board.id] ?? false,
              ]),
            ),
          },
        });
        showToast("Configuration saved");
      } catch {
        setError("Failed to save configuration");
      }
    },
    [boards, queryClient, saveConfigMutation, showToast],
  );

  const handleConnect = (dirty: boolean) => {
    if (dirty || !config) {
      setError("Please save configuration first");
      return;
    }
    try {
      initiateOAuthFlow(config);
    } catch {
      setError("Failed to initiate OAuth flow");
    }
  };

  const handleDisconnect = () => {
    setError(null);
    clearTokensMutation.mutate(undefined, {
      onSuccess: () => showToast("Disconnected from JIRA"),
      onError: () => setError("Failed to disconnect"),
    });
  };

  return (
    <Formik<JiraSettingsFormValues>
      initialValues={initialValues}
      onSubmit={handleSaveConfig}
      enableReinitialize
    >
      {({ dirty, isSubmitting, resetForm, setFieldValue, values }) => (
        <>
          <JiraSettingsFooter
            dirty={dirty}
            isSubmitting={isSubmitting}
            onCancel={() => {
              resetForm();
              setError(null);
            }}
          />
          <Form id={JIRA_SETTINGS_FORM_ID} className="space-y-6">
            <JiraBoardScopeToggles
              boards={boards}
              isConnected={isConnected}
              isDisabled={isSubmitting}
              onToggle={(boardId) => {
                void setFieldValue(
                  `boardJiraEnabled.${boardId}`,
                  !(values.boardJiraEnabled[boardId] ?? false),
                );
              }}
              values={values.boardJiraEnabled}
            />

            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Configuration
              </h3>

              <JiraSetupGuide />

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="instanceUrl"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    JIRA Instance URL
                  </label>
                  <div className="relative">
                    <input
                      id="instanceUrl"
                      type="text"
                      value={values.instanceUrl}
                      onChange={(e) => {
                        void setFieldValue("instanceUrl", e.target.value);
                      }}
                      placeholder="https://your-domain.atlassian.net"
                      className="w-full px-3 py-2 pr-8 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                    />
                    <CopyButton value={values.instanceUrl} />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="clientId"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    OAuth Client ID
                  </label>
                  <div className="relative">
                    <input
                      id="clientId"
                      type="text"
                      value={values.clientId}
                      onChange={(e) => {
                        void setFieldValue("clientId", e.target.value);
                      }}
                      placeholder="Your OAuth Client ID"
                      className="w-full px-3 py-2 pr-8 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                    />
                    <CopyButton value={values.clientId} />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="clientSecret"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    OAuth Client Secret
                  </label>
                  <input
                    id="clientSecret"
                    type="password"
                    value={values.clientSecret}
                    onChange={(e) => {
                      void setFieldValue("clientSecret", e.target.value);
                    }}
                    placeholder="Your OAuth Client Secret"
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-neutral-200 dark:border-neutral-700" />

            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Connection
              </h3>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-500"}`}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {isConnected ? "Connected to JIRA" : "Not connected"}
                  </span>
                </div>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={clearTokensMutation.isPending}
                    className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleConnect(dirty);
                    }}
                    disabled={!config || dirty}
                    className="px-3 py-1.5 text-sm font-medium bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </Form>
        </>
      )}
    </Formik>
  );
}
