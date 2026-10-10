import type { JiraSubtask, Ticket } from '@/db/database';
import { isValidTicketKey } from '@/modules/tickets/utils/validateTicketKey';

const STATUS_CATEGORIES = new Set(['new', 'indeterminate', 'done']);

export function extractJiraSubtasks(raw: unknown): JiraSubtask[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const subtasks: JiraSubtask[] = [];
  for (const item of raw) {
    const parsed = parseSubtaskRecord(item);
    if (parsed) {
      subtasks.push(parsed);
    }
  }
  return subtasks;
}

/** False when an identifiable child is missing the summary Jira's list needs. */
export function isUsableJiraSubtaskField(raw: unknown): boolean {
  if (!Array.isArray(raw)) {
    return false;
  }
  return raw.every((item) => !hasSubtaskIdentity(item) || parseSubtaskRecord(item) !== undefined);
}

export interface ParentSubtask {
  readonly parentKey: string;
  readonly subtask: JiraSubtask;
}

export function parseParentSubtask(issue: unknown): ParentSubtask | undefined {
  const subtask = parseSubtaskRecord(issue);
  const parentKey = readParentKey(issue);
  if (!subtask || !parentKey) {
    return undefined;
  }
  return { parentKey, subtask };
}

export function groupSubtasksByParent(issues: readonly unknown[]): Map<string, JiraSubtask[]> {
  const grouped = new Map<string, JiraSubtask[]>();
  const seen = new Set<string>();
  for (const issue of issues) {
    const parsed = parseParentSubtask(issue);
    if (!parsed || seen.has(`${parsed.parentKey}:${parsed.subtask.id}`)) {
      continue;
    }
    seen.add(`${parsed.parentKey}:${parsed.subtask.id}`);
    const list = grouped.get(parsed.parentKey) ?? [];
    list.push(parsed.subtask);
    grouped.set(parsed.parentKey, list);
  }
  return grouped;
}

export function getTicketSubtaskCount(ticket: Pick<Ticket, 'jiraData'>): number {
  return ticket.jiraData?.subtasks?.length ?? 0;
}

export function isJiraSubtaskDone(subtask: Pick<JiraSubtask, 'status' | 'statusCategory'>): boolean {
  if (subtask.statusCategory === 'done') {
    return true;
  }
  return subtask.status?.trim().toLowerCase() === 'done';
}

function parseSubtaskRecord(item: unknown): JiraSubtask | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }
  const record = item as Record<string, unknown>;
  const id = readId(record.id);
  const key = readString(record.key)?.toUpperCase();
  if (!id || !key || !isValidTicketKey(key)) {
    return undefined;
  }
  const fields = asRecord(record.fields);
  const summary = readString(fields?.summary);
  if (!summary) {
    return undefined;
  }
  const status = readStatus(fields);
  const assignee = readAssignee(fields);
  return {
    id,
    key,
    summary,
    ...status,
    ...(assignee ? { assignee } : {}),
  };
}

function hasSubtaskIdentity(item: unknown): boolean {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const record = item as Record<string, unknown>;
  return readId(record.id) !== undefined && readString(record.key) !== undefined;
}

function readParentKey(issue: unknown): string | undefined {
  const fields = asRecord(asRecord(issue)?.fields);
  const parent = asRecord(fields?.parent);
  const key = readString(parent?.key)?.toUpperCase();
  return key && isValidTicketKey(key) ? key : undefined;
}

function readStatus(fields: Record<string, unknown> | undefined): Pick<JiraSubtask, 'status' | 'statusCategory'> {
  const status = asRecord(fields?.status);
  const name = readString(status?.name);
  const categoryKey = readString(asRecord(status?.statusCategory)?.key)?.toLowerCase();
  const statusCategory = categoryKey && STATUS_CATEGORIES.has(categoryKey) ? categoryKey : undefined;
  return {
    ...(name ? { status: name } : {}),
    ...(statusCategory ? { statusCategory } : {}),
  };
}

function readAssignee(fields: Record<string, unknown> | undefined): string | undefined {
  return readString(asRecord(fields?.assignee)?.displayName);
}

function readId(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return readString(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}
