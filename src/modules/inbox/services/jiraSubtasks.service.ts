import type { JiraSubtask } from '@/db/database';
import type { AtlassianConfig } from '@/modules/settings';
import { getJiraCloudExApiBase } from '@/modules/settings';
import {
  extractJiraSubtasks,
  groupSubtasksByParent,
  isUsableJiraSubtaskField,
  isValidTicketKey,
} from '@/modules/tickets';

const SUBTASK_FIELDS = 'summary,status,assignee,parent';
const SUBTASK_PAGE_SIZE = 100;
const MAX_SUBTASK_PAGES = 20;

interface IssueWithSubtasks {
  readonly key: string;
  readonly fields: {
    readonly subtasks?: unknown;
  };
}

interface JiraSearchPage {
  issues?: unknown[];
  nextPageToken?: string | null;
  isLast?: boolean;
}

export async function resolveJiraSubtasks(
  issues: readonly IssueWithSubtasks[],
  config: AtlassianConfig,
  accessToken: string,
): Promise<ReadonlyMap<string, JiraSubtask[]> | undefined> {
  const embedded = readEmbeddedSubtasks(issues);
  try {
    const fetched = await fetchSubtasksByParent(issues.map((issue) => issue.key), config, accessToken);
    if (!hasAnySubtask(fetched) && embedded && hasAnySubtask(embedded)) {
      return embedded;
    }
    return orderLikeEmbedded(fetched, embedded);
  } catch (error) {
    console.error('Failed to fetch JIRA subtasks:', error);
    return embedded;
  }
}

function readEmbeddedSubtasks(
  issues: readonly IssueWithSubtasks[],
): Map<string, JiraSubtask[]> | undefined {
  let sawField = false;
  const grouped = new Map<string, JiraSubtask[]>();
  for (const issue of issues) {
    if (!Object.hasOwn(issue.fields, 'subtasks')) {
      grouped.set(issue.key, []);
      continue;
    }
    sawField = true;
    if (!isUsableJiraSubtaskField(issue.fields.subtasks)) {
      return undefined;
    }
    grouped.set(issue.key, extractJiraSubtasks(issue.fields.subtasks));
  }
  return sawField ? grouped : undefined;
}

async function fetchSubtasksByParent(
  parentKeys: readonly string[],
  config: AtlassianConfig,
  accessToken: string,
): Promise<Map<string, JiraSubtask[]>> {
  const keys = [...new Set(parentKeys.map((key) => key.toUpperCase()).filter((key) => isValidTicketKey(key)))];
  const grouped = keys.length === 0
    ? new Map<string, JiraSubtask[]>()
    : groupSubtasksByParent(await searchSubtaskIssues(buildSubtaskJql(keys), config, accessToken));
  const result = new Map<string, JiraSubtask[]>();
  for (const key of parentKeys) {
    result.set(key, grouped.get(key.toUpperCase()) ?? []);
  }
  return result;
}

function buildSubtaskJql(keys: readonly string[]): string {
  return `parent in (${keys.join(',')}) AND issuetype in subTaskIssueTypes() ORDER BY key ASC`;
}

async function searchSubtaskIssues(
  jql: string,
  config: AtlassianConfig,
  accessToken: string,
): Promise<unknown[]> {
  const issues: unknown[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < MAX_SUBTASK_PAGES; page += 1) {
    const response = await fetch(buildSubtaskSearchUrl(config, jql, nextPageToken), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch JIRA subtasks: ${response.statusText}`);
    }
    const data = await response.json() as JiraSearchPage;
    if (Array.isArray(data.issues)) {
      issues.push(...data.issues);
    }
    if (data.isLast || !data.nextPageToken) {
      return issues;
    }
    nextPageToken = data.nextPageToken;
  }
  return issues;
}

function buildSubtaskSearchUrl(config: AtlassianConfig, jql: string, nextPageToken?: string): string {
  const base = config.cloudId ? getJiraCloudExApiBase(config.cloudId) : config.instanceUrl;
  const token = nextPageToken ? `&nextPageToken=${encodeURIComponent(nextPageToken)}` : '';
  return `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${SUBTASK_FIELDS}&maxResults=${SUBTASK_PAGE_SIZE}${token}`;
}

function orderLikeEmbedded(
  fetched: Map<string, JiraSubtask[]>,
  embedded: Map<string, JiraSubtask[]> | undefined,
): Map<string, JiraSubtask[]> {
  if (!embedded) {
    return fetched;
  }
  const ordered = new Map<string, JiraSubtask[]>();
  for (const [key, children] of fetched) {
    ordered.set(key, mergeSubtaskOrder(children, embedded.get(key)));
  }
  return ordered;
}

function mergeSubtaskOrder(
  fetched: readonly JiraSubtask[],
  embedded: readonly JiraSubtask[] | undefined,
): JiraSubtask[] {
  if (!embedded || embedded.length === 0) {
    return [...fetched];
  }
  const byId = new Map(fetched.map((subtask) => [subtask.id, subtask]));
  const used = new Set<string>();
  const merged: JiraSubtask[] = [];
  for (const subtask of embedded) {
    const richer = byId.get(subtask.id);
    if (!richer) {
      continue;
    }
    merged.push(richer);
    used.add(subtask.id);
  }
  for (const subtask of fetched) {
    if (!used.has(subtask.id)) {
      merged.push(subtask);
    }
  }
  return merged.length > 0 ? merged : [...fetched];
}

function hasAnySubtask(grouped: ReadonlyMap<string, JiraSubtask[]>): boolean {
  for (const subtasks of grouped.values()) {
    if (subtasks.length > 0) {
      return true;
    }
  }
  return false;
}
