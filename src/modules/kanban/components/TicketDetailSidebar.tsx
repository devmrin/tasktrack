import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import { Callout } from "@radix-ui/themes";
import * as Yup from "yup";
import { Check, ChevronDown, X, ExternalLink, Copy, Info } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Select from "@/components/Select";
import type { JiraComment } from "@/db/database";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { useAtlassianConfigQuery } from "@/modules/settings";
import { updateTicket } from "@/modules/tickets";
import { isValidTicketKey } from "@/modules/tickets/utils/validateTicketKey";
import { useActiveBoard } from "@/modules/boards/hooks/useActiveBoard";
import { useBoardTerminology } from "@/modules/boards/hooks/useBoardTerminology";
import { useJiraTicketsQuery } from "@/modules/tickets/hooks/useTicketsQuery";
import { TICKET_PRIORITY_VALUES, type TicketPriority } from "@/modules/tickets";
import { formatDueDate } from "@/modules/tickets";
import { TicketDescriptionEditor } from "@/components/TicketDescriptionEditor";
import { Tooltip } from "@/components/Tooltip";
import { isEmptyEditorHtml } from "@/utils/editorHtml";
import { JiraAdfRenderer } from "@/modules/kanban/components/JiraAdfRenderer";
import { SanitizedHtml } from "@/modules/kanban/components/SanitizedHtml";
import type { BoardTerminology } from "@/modules/boards/types/board.types";

type EditablePriority = TicketPriority | "none";

const ticketValidationSchema = Yup.object({
  title: Yup.string().trim().required("Title is required"),
  description: Yup.string().trim().optional(),
  dueDate: Yup.string()
    .trim()
    .optional()
    .test("iso-date", "Must be in YYYY-MM-DD format", (value) => {
      if (!value) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }),
  priority: Yup.mixed<EditablePriority>()
    .oneOf(["none", ...TICKET_PRIORITY_VALUES])
    .optional(),
  customKey: Yup.string()
    .trim()
    .optional()
    .test("jira-format", "Must be in format PROJ-123", (value) => {
      if (!value) return true;
      return isValidTicketKey(value);
    }),
});

function CopyButton({ text, copyLabel }: { readonly text: string; readonly copyLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors"
      aria-label={copyLabel}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function TicketDescriptionField({ id }: { readonly id?: string }) {
  const { setFieldValue, values } = useFormikContext<{ description: string }>();
  return (
    <TicketDescriptionEditor
      id={id}
      value={values.description ?? ""}
      onChange={(html) => setFieldValue("description", html)}
      placeholder="Description (optional)"
      minHeight="5rem"
    />
  );
}

function AutoResizeTitleField() {
  const { values, handleBlur, handleChange } = useFormikContext<{ title: string }>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [values.title]);

  return (
    <textarea
      ref={textareaRef}
      id="ticket-title"
      name="title"
      value={values.title}
      onBlur={handleBlur}
      onChange={handleChange}
      rows={1}
      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 resize-none overflow-hidden"
    />
  );
}

function TicketKeyField({
  jiraKeyOptions,
  terminology,
  jiraEnabledForBoard,
}: {
  readonly jiraKeyOptions: readonly string[];
  readonly terminology: BoardTerminology;
  readonly jiraEnabledForBoard: boolean;
}) {
  const { setFieldValue, values, errors, touched } = useFormikContext<{
    customKey: string;
  }>();

  const [customKeyInput, setCustomKeyInput] = useState("");
  const [customKeyError, setCustomKeyError] = useState("");

  const currentValue = values.customKey ?? "";
  const selectMode: "none" | "existing" | "other" =
    currentValue === ""
      ? "none"
      : jiraKeyOptions.includes(currentValue)
        ? "existing"
        : "other";
  const selectedKey = selectMode === "existing" ? currentValue : "";
  const resolvedCustomKeyInput =
    selectMode === "other" ? customKeyInput || currentValue : customKeyInput;

  const handleSelectChange = (val: string) => {
    setCustomKeyError("");
    if (val === "none") {
      setCustomKeyInput("");
      setFieldValue("customKey", "");
    } else if (val === "other") {
      setCustomKeyInput("");
      setFieldValue("customKey", "");
    } else {
      setCustomKeyInput("");
      setFieldValue("customKey", val);
    }
  };

  const showError = touched.customKey && errors.customKey;

  if (!jiraEnabledForBoard) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {`Relates to ${terminology.item} ID (optional)`}
        </span>
        <Tooltip
          content="For reference only. You may optionally relate this item to an existing JIRA issue for improved tracking"
          side="top"
        >
          <button
            type="button"
            tabIndex={-1}
            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            aria-label="Relation info"
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        </Tooltip>
      </div>
      <Select.Root
        value={selectMode === "existing" ? selectedKey : selectMode}
        onValueChange={handleSelectChange}
      >
        <Select.Trigger
          className="inline-flex w-full items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 outline-none"
          aria-label={`Relates to ${terminology.item} ID`}
        >
          <Select.Value placeholder={`No ${terminology.item} ID`} />
          <Select.Icon>
            <ChevronDown
              className="size-3.5 text-neutral-500 dark:text-neutral-400"
              aria-hidden
            />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            allowSearch
            searchPlaceholder={`Search ${terminology.item} ID`}
            className="z-[60] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
            position="popper"
            sideOffset={4}
            align="start"
          >
            <Select.Viewport className="p-1">
              <Select.Item
                value="none"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
              >
                <Select.ItemText>{`No ${terminology.item} ID`}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check className="size-3.5" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
              {jiraKeyOptions.length > 0 && (
                <Select.Group>
                  <Select.Label className="px-3 py-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    {`Synced JIRA ${terminology.items}`}
                  </Select.Label>
                  {jiraKeyOptions.map((key) => (
                    <Select.Item
                      key={key}
                      value={key}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                    >
                      <Select.ItemText>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                            {key}
                          </span>
                        </span>
                      </Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <Check className="size-3.5" aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Group>
              )}
              <Select.Separator className="h-px my-1 bg-neutral-200 dark:bg-neutral-700" />
              <Select.Item
                value="other"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
              >
                <Select.ItemText>Other (enter manually)</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check className="size-3.5" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {selectMode === "other" && (
        <div>
          <input
            type="text"
            value={resolvedCustomKeyInput}
            onChange={(e) => {
              const next = e.target.value;
              setCustomKeyInput(next);
              setFieldValue("customKey", next.trim().toUpperCase());
              if (customKeyError) setCustomKeyError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            onBlur={() => {
              const val = resolvedCustomKeyInput.trim().toUpperCase();
              if (val && !isValidTicketKey(val)) {
                setCustomKeyError("Must be in format PROJ-123");
              }
            }}
            placeholder="e.g. PROJ-123"
            className={`w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 ${
              showError || customKeyError
                ? "border-red-400 dark:border-red-500"
                : "border-neutral-300 dark:border-neutral-600"
            }`}
          />
          {(showError || customKeyError) && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors.customKey || customKeyError}
            </p>
          )}
        </div>
      )}
      {selectMode === "existing" && selectedKey && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Currently selected:
          </span>
          <span className="inline-block text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
            {selectedKey}
          </span>
        </div>
      )}
    </div>
  );
}

function formatJiraCommentDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
}

function formatTicketTimestamp(value: number): string {
  return new Date(value).toLocaleString();
}

function buildJiraCommentUrl(
  jiraIssueUrl: string | undefined,
  commentId: string,
): string | undefined {
  if (!jiraIssueUrl) {
    return undefined;
  }
  const separator = jiraIssueUrl.includes("?") ? "&" : "?";
  return `${jiraIssueUrl}${separator}focusedCommentId=${encodeURIComponent(commentId)}`;
}

interface NestedJiraComment extends JiraComment {
  children: NestedJiraComment[];
}

function buildJiraCommentTree(
  comments: readonly JiraComment[],
): NestedJiraComment[] {
  const nodeById = new Map<string, NestedJiraComment>();
  const roots: NestedJiraComment[] = [];

  for (const comment of comments) {
    nodeById.set(comment.id, { ...comment, children: [] });
  }

  for (const node of nodeById.values()) {
    if (!node.parentId) {
      roots.push(node);
      continue;
    }
    const parent = nodeById.get(node.parentId);
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function JiraCommentItem({
  comment,
  depth = 0,
  jiraIssueUrl,
}: {
  readonly comment: NestedJiraComment;
  readonly depth?: number;
  readonly jiraIssueUrl?: string;
}) {
  const updatedAt = formatJiraCommentDate(comment.updatedAt);
  const fallbackCreatedAt = formatJiraCommentDate(comment.createdAt);
  const displayTimestamp = updatedAt ?? fallbackCreatedAt;
  const commentUrl = buildJiraCommentUrl(jiraIssueUrl, comment.id);

  return (
    <div
      className={`space-y-2 ${depth > 0 ? "border-l border-neutral-300 dark:border-neutral-700 pl-3" : ""}`}
      style={{ marginLeft: depth * 8 }}
    >
      <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {comment.authorName ?? "Unknown author"}
          </span>
          {displayTimestamp && <span>• {displayTimestamp}</span>}
          {commentUrl && (
            <a
              href={commentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
            >
              Open in JIRA
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
        <div className="text-sm text-neutral-900 dark:text-neutral-200 space-y-2">
          {comment.body ? (
            <JiraAdfRenderer doc={comment.body} />
          ) : (
            <p className="text-neutral-500 dark:text-neutral-300">
              No comment body
            </p>
          )}
        </div>
      </div>
      {comment.children.map((child) => (
        <JiraCommentItem
          key={child.id}
          comment={child}
          depth={depth + 1}
          jiraIssueUrl={jiraIssueUrl}
        />
      ))}
    </div>
  );
}

export function TicketDetailSidebar({
  onSaved,
}: {
  readonly onSaved?: () => void;
}) {
  const { selectedTicket, closeTicketDetail, openTicketDetail } =
    useTicketDetail();
  const { activeBoardId, activeBoard } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const atlassianConfigQuery = useAtlassianConfigQuery();
  const jiraTicketsQuery = useJiraTicketsQuery(activeBoardId);
  const jiraKeyOptions = useMemo(
    () =>
      (jiraTicketsQuery.data ?? [])
        .map((t) => t.jiraData?.jiraKey)
        .filter(Boolean) as string[],
    [jiraTicketsQuery.data],
  );

  const isOpen = selectedTicket !== null;
  const isJira = selectedTicket?.type === "jira";
  const isEditable = !isJira;
  const showPriority = isJira || (activeBoard?.showPriority ?? true);
  const showDueDate = isJira || (activeBoard?.showDueDate ?? true);
  const formattedDueDate = formatDueDate(selectedTicket?.dueDate);
  const linkedLocalJiraUrl = useMemo(() => {
    if (!selectedTicket || selectedTicket.type !== "local") {
      return undefined;
    }
    const key = selectedTicket.customKey?.trim().toUpperCase();
    const instanceUrl = atlassianConfigQuery.data?.instanceUrl?.trim();
    if (!key || !instanceUrl || !isValidTicketKey(key)) {
      return undefined;
    }
    return `${instanceUrl.replace(/\/+$/, "")}/browse/${encodeURIComponent(key)}`;
  }, [atlassianConfigQuery.data?.instanceUrl, selectedTicket]);

  const handleSave = async (values: {
    title: string;
    description: string;
    dueDate: string;
    customKey: string;
    priority: EditablePriority;
  }) => {
    if (!selectedTicket || !isEditable) return;
    const title = values.title.trim();
    const rawDesc = values.description?.trim() ?? "";
    const description =
      rawDesc && !isEmptyEditorHtml(rawDesc) ? rawDesc : undefined;
    const dueDate = values.dueDate?.trim() || undefined;
    const customKey = values.customKey?.trim().toUpperCase() || undefined;
    const priority = values.priority === "none" ? undefined : values.priority;
    const hasChanges =
      title !== selectedTicket.title ||
      description !== (selectedTicket.description ?? "") ||
      dueDate !== (selectedTicket.dueDate ?? undefined) ||
      customKey !== (selectedTicket.customKey ?? undefined) ||
      priority !== selectedTicket.priority;
    if (hasChanges) {
      await updateTicket(selectedTicket.id, {
        title,
        description,
        dueDate: dueDate ?? "",
        customKey: customKey ?? "",
        priority,
      });
      // Update context's selectedTicket so Formik resets dirty flag
      openTicketDetail({
        ...selectedTicket,
        title,
        description: description || undefined,
        dueDate: dueDate || undefined,
        customKey: customKey || undefined,
        priority,
        updatedAt: Date.now(),
      });
      onSaved?.();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={closeTicketDetail}
          aria-hidden
        />
      )}
      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-[26rem] bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col border-l border-neutral-200 dark:border-neutral-700 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label={`${terminology.Item} details`}
      >
        {selectedTicket && (
          <Formik
            key={selectedTicket.id}
            initialValues={{
              title: selectedTicket.title,
              description: selectedTicket.description ?? "",
              dueDate: selectedTicket.dueDate ?? "",
              customKey: selectedTicket.customKey ?? "",
              priority: selectedTicket.priority ?? "none",
            }}
            validationSchema={ticketValidationSchema}
            onSubmit={handleSave}
            enableReinitialize
          >
            {({ isSubmitting, dirty }) => (
              <Form className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate pr-2">
                    {isJira ? `JIRA ${terminology.Item}` : `Local ${terminology.item}`}
                  </h2>
                  <button
                    type="button"
                    onClick={closeTicketDetail}
                    className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                    aria-label="Close sidebar"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5 min-h-0">
                  {isJira && selectedTicket.jiraData && (
                    <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md font-medium">
                            {selectedTicket.jiraData.jiraKey}
                          </span>
                          <CopyButton
                            text={selectedTicket.jiraData.jiraKey}
                            copyLabel={`Copy ${terminology.item} ID`}
                          />
                        </div>
                        {selectedTicket.jiraData.jiraUrl && (
                          <a
                            href={selectedTicket.jiraData.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            Open in JIRA
                            <ExternalLink className="size-3" aria-hidden />
                          </a>
                        )}
                      </div>
                      {(selectedTicket.jiraData.status ||
                        selectedTicket.jiraData.priority) && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.jiraData.status && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-xs font-medium">
                              {selectedTicket.jiraData.status}
                            </span>
                          )}
                          {selectedTicket.jiraData.priority && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-md text-xs font-medium">
                              {selectedTicket.jiraData.priority}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!isJira && selectedTicket.customKey && (
                    <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-1">
                        <span className="text-sm px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md font-medium">
                          {selectedTicket.customKey}
                        </span>
                        <CopyButton
                          text={selectedTicket.customKey}
                          copyLabel={`Copy ${terminology.item} ID`}
                        />
                      </div>
                      {linkedLocalJiraUrl && (
                        <a
                          href={linkedLocalJiraUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                        >
                          Open in JIRA
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  )}

                  {isEditable && showPriority && (
                    <Callout.Root size="1" color="blue" variant="soft">
                      <Callout.Icon>
                        <Info className="size-4" aria-hidden />
                      </Callout.Icon>
                      <Callout.Text>All fields are editable.</Callout.Text>
                    </Callout.Root>
                  )}

                  <div>
                    <label
                      htmlFor="ticket-title"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                    >
                      Title{" "}
                      <span className="text-red-500" aria-hidden>
                        *
                      </span>
                    </label>
                    {isEditable ? (
                      <>
                        <AutoResizeTitleField />
                        <ErrorMessage
                          name="title"
                          component="p"
                          className="text-xs text-red-600 dark:text-red-400 mt-1"
                        />
                      </>
                    ) : (
                      <p className="text-sm text-neutral-900 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800/50 rounded-md px-3 py-2 border border-neutral-200 dark:border-neutral-700 cursor-auto select-text">
                        {selectedTicket.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="ticket-description"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                    >
                      Description
                    </label>
                    {isEditable ? (
                      <TicketDescriptionField id="ticket-description" />
                    ) : (
                      <div className="text-sm bg-neutral-50 dark:bg-neutral-800/50 rounded-md px-3 py-2 border-l-4 border-neutral-300 dark:border-neutral-600 min-h-[5rem] overflow-hidden cursor-auto select-text [&_.ticket-description-content]:text-neutral-900 [&_.ticket-description-content]:dark:text-neutral-200">
                        {selectedTicket.description ? (
                          <SanitizedHtml
                            html={selectedTicket.description}
                            className="ticket-description-content"
                          />
                        ) : (
                          <p className="text-neutral-500 dark:text-neutral-300">
                            No description
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditable && showDueDate && (
                    <TicketKeyField
                      jiraKeyOptions={jiraKeyOptions}
                      terminology={terminology}
                      jiraEnabledForBoard={activeBoard?.jiraEnabled ?? false}
                    />
                  )}

                  {isEditable && (
                    <div>
                      <label
                        htmlFor="ticket-priority"
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        Priority (optional)
                      </label>
                      <Field name="priority">
                        {({
                          field,
                          form,
                        }: {
                          field: { value: EditablePriority };
                          form: {
                            setFieldValue: (
                              name: string,
                              value: EditablePriority,
                            ) => void;
                          };
                        }) => (
                          <Select.Root
                            value={field.value}
                            onValueChange={(value) =>
                              form.setFieldValue(
                                "priority",
                                value as EditablePriority,
                              )
                            }
                          >
                            <Select.Trigger
                              id="ticket-priority"
                              className="inline-flex w-full items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-500 outline-none"
                              aria-label="Priority"
                            >
                              <Select.Value placeholder="No priority" />
                              <Select.Icon>
                                <ChevronDown
                                  className="size-3.5 text-neutral-500 dark:text-neutral-400"
                                  aria-hidden
                                />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content
                                className="z-[60] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
                                position="popper"
                                sideOffset={4}
                                align="start"
                              >
                                <Select.Viewport className="p-1">
                                  <Select.Item
                                    value="none"
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                                  >
                                    <Select.ItemText>
                                      No priority
                                    </Select.ItemText>
                                    <Select.ItemIndicator className="ml-auto">
                                      <Check className="size-3.5" aria-hidden />
                                    </Select.ItemIndicator>
                                  </Select.Item>
                                  {TICKET_PRIORITY_VALUES.map((priority) => (
                                    <Select.Item
                                      key={priority}
                                      value={priority}
                                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 rounded cursor-pointer outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700"
                                    >
                                      <Select.ItemText>
                                        {priority}
                                      </Select.ItemText>
                                      <Select.ItemIndicator className="ml-auto">
                                        <Check
                                          className="size-3.5"
                                          aria-hidden
                                        />
                                      </Select.ItemIndicator>
                                    </Select.Item>
                                  ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        )}
                      </Field>
                      <ErrorMessage
                        name="priority"
                        component="p"
                        className="text-xs text-red-600 dark:text-red-400 mt-1"
                      />
                    </div>
                  )}
                  {isEditable && (
                    <div>
                      <label
                        htmlFor="ticket-due-date"
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        Due date (optional)
                      </label>
                      <Field
                        id="ticket-due-date"
                        name="dueDate"
                        type="date"
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                      />
                      <ErrorMessage
                        name="dueDate"
                        component="p"
                        className="text-xs text-red-600 dark:text-red-400 mt-1"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {formattedDueDate && (
                      <div>
                        <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Due date
                        </span>
                        <p className="text-sm text-neutral-900 dark:text-neutral-200 break-words leading-tight">
                          {formattedDueDate}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Updated
                      </span>
                      <p className="text-sm text-neutral-900 dark:text-neutral-200 break-words leading-tight">
                        {formatTicketTimestamp(selectedTicket.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Created
                      </span>
                      <p className="text-sm text-neutral-900 dark:text-neutral-200 break-words leading-tight">
                        {formatTicketTimestamp(selectedTicket.createdAt)}
                      </p>
                    </div>
                  </div>

                  {isJira &&
                    selectedTicket.jiraData &&
                    (selectedTicket.jiraData.comments?.length ?? 0) > 0 && (
                      <div>
                        <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Comments
                        </span>
                        <div className="space-y-3">
                          {buildJiraCommentTree(
                            selectedTicket.jiraData.comments ?? [],
                          ).map((comment) => (
                            <JiraCommentItem
                              key={comment.id}
                              comment={comment}
                              jiraIssueUrl={selectedTicket.jiraData?.jiraUrl}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {isEditable && (
                  <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 px-4 sm:px-5 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTicketDetail();
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isSubmitting || !dirty}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 bg-neutral-800 dark:bg-neutral-200 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </Form>
            )}
          </Formik>
        )}
      </aside>
    </>
  );
}
