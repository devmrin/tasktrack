import type { JiraComment, Ticket, TransactionTicketRef } from '@/db/database';
import { recordHistoryTransaction } from '@/modules/history/services/history.service';
import type { AtlassianConfig } from '@/modules/settings';
import { createTicket, updateTicket, getAllTickets, getJiraTickets, deleteTickets } from '@/modules/tickets';
import {
  getValidAccessToken,
  getAtlassianConfig,
  refreshCloudIdFromToken,
  isJiraCloud,
} from '@/modules/settings';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import { normalizeTicketPriority } from '@/utils/ticketPriority';

const SKIP_RENDERED_FIELDS = new Set([
  'summary', 'description', 'status', 'assignee', 'priority',
  'issuetype', 'reporter', 'creator', 'created', 'updated',
  'resolutiondate', 'resolution', 'project', 'components',
  'labels', 'fixVersions', 'versions', 'duedate', 'votes',
  'watches', 'worklog', 'comment', 'attachment', 'timetracking',
]);

function descriptionToHtml(issue: JiraIssue): string | undefined {
  const rendered = issue.renderedFields;
  if (typeof rendered?.description === 'string' && rendered.description.trim()) {
    return rendered.description.trim();
  }

  if (rendered) {
    for (const [key, value] of Object.entries(rendered)) {
      if (SKIP_RENDERED_FIELDS.has(key)) continue;
      if (typeof value === 'string' && value.trim() && value.includes('<p')) {
        return value.trim();
      }
    }
  }

  const desc = issue.fields.description;
  if (typeof desc === 'string' && desc.trim()) {
    return desc.trim();
  }
  return undefined;
}

async function removeStaleJiraTickets(
  freshJiraKeys: Set<string>,
): Promise<Ticket[]> {
  const existingJiraTickets = await getJiraTickets();
  const staleTickets = existingJiraTickets.filter(
    (t) => t.jiraData?.jiraKey && !freshJiraKeys.has(t.jiraData.jiraKey),
  );
  const staleIds = staleTickets.map((t) => t.id);
  if (staleIds.length > 0) {
    await deleteTickets(staleIds, { skipHistory: true });
  }
  return staleTickets;
}

export interface JiraSyncResult {
  created: Ticket[];
  updated: Ticket[];
  deleted: string[];
  removedTickets: Ticket[];
}

async function issuesToTickets(
  issues: JiraIssue[],
  config: AtlassianConfig
): Promise<JiraSyncResult> {
  const freshJiraKeys = new Set(issues.map((i) => i.key));
  const removedTickets = await removeStaleJiraTickets(freshJiraKeys);
  const deleted = removedTickets.map((ticket) => ticket.id);

  const allTickets = await getAllTickets();
  const existingByJiraKey = new Map<string, Ticket>();
  for (const t of allTickets) {
    if (t.type === 'jira' && t.jiraData?.jiraKey) {
      existingByJiraKey.set(t.jiraData.jiraKey, t);
    }
  }

  const created: Ticket[] = [];
  const updated: Ticket[] = [];

  for (const issue of issues) {
    const description = descriptionToHtml(issue);
    const comments = extractIssueComments(issue);
    const dueDate = issue.fields.duedate?.trim() || undefined;
    const jiraData = {
      jiraId: issue.id,
      jiraUrl: `${config.instanceUrl}/browse/${issue.key}`,
      jiraKey: issue.key,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName,
      priority: issue.fields.priority?.name,
      comments,
    };
    const priority = normalizeTicketPriority(issue.fields.priority?.name);

    const existing = existingByJiraKey.get(issue.key);
    if (existing) {
      await updateTicket(existing.id, {
        title: issue.fields.summary,
        description,
        priority,
        dueDate,
        jiraData: { ...existing.jiraData, ...jiraData },
      });
      updated.push({
        ...existing,
        title: issue.fields.summary,
        description,
        priority,
        dueDate,
        jiraData: { ...existing.jiraData, ...jiraData },
      });
    } else {
      const createdTicket = await createTicket({
        title: issue.fields.summary,
        description,
        priority,
        dueDate,
        type: 'jira',
        columnId: INBOX_COLUMN_ID,
        jiraData,
      });
      created.push(createdTicket);
    }
  }

  return { created, updated, deleted, removedTickets };
}

function toTransactionTicketRef(ticket: Ticket): TransactionTicketRef {
  return {
    ticketId: ticket.id,
    ticketType: ticket.type,
    ticketTitle: ticket.title,
    ticketKey: ticket.jiraData?.jiraKey ?? ticket.customKey,
  };
}

function extractIssueComments(issue: JiraIssue): JiraComment[] | undefined {
  const comments = issue.fields.comment?.comments;
  if (!comments || comments.length === 0) {
    return undefined;
  }

  return comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parentId ? String(comment.parentId) : undefined,
    authorName: comment.author?.displayName,
    createdAt: comment.created,
    updatedAt: comment.updated,
    body: isAdfNode(comment.body) ? comment.body : undefined,
  }));
}

function isAdfNode(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const node = value as { type?: unknown };
  return typeof node.type === 'string';
}

interface JiraIssueComment {
  id: string;
  parentId?: string | number;
  created?: string;
  updated?: string;
  author?: {
    displayName?: string;
  };
  body?: unknown;
}

interface JiraIssueCommentCollection {
  comments: JiraIssueComment[];
  total?: number;
  maxResults?: number;
  startAt?: number;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    duedate?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    priority?: {
      name: string;
    };
    comment?: JiraIssueCommentCollection;
  };
  renderedFields?: Record<string, unknown>;
  self: string;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
}

const SEARCH_FIELDS = '*navigable';

function buildApiBase(cloudId: string | undefined, instanceUrl: string): string {
  return cloudId
    ? `https://api.atlassian.com/ex/jira/${cloudId}`
    : instanceUrl;
}

function buildSearchUrl(cloudId: string | undefined, instanceUrl: string, jql: string): string {
  const base = buildApiBase(cloudId, instanceUrl);
  return `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${SEARCH_FIELDS}&maxResults=50&expand=renderedFields`;
}

function buildIssueCommentsUrl(
  cloudId: string | undefined,
  instanceUrl: string,
  issueKey: string,
  startAt: number
): string {
  const base = buildApiBase(cloudId, instanceUrl);
  return `${base}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment?startAt=${startAt}&maxResults=100`;
}

function isCommentsIncomplete(issue: JiraIssue): boolean {
  const commentField = issue.fields.comment;
  if (!commentField) {
    return true;
  }

  const loadedCount = commentField.comments.length;
  const totalCount = typeof commentField.total === 'number'
    ? commentField.total
    : loadedCount;
  return loadedCount < totalCount;
}

async function fetchAllIssueComments(
  issueKey: string,
  cloudId: string | undefined,
  instanceUrl: string,
  accessToken: string
): Promise<JiraIssueCommentCollection | undefined> {
  let startAt = 0;
  let total = 0;
  let maxResults = 0;
  const comments: JiraIssueComment[] = [];

  while (true) {
    const response = await fetch(buildIssueCommentsUrl(cloudId, instanceUrl, issueKey, startAt), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json() as JiraIssueCommentCollection;
    total = typeof data.total === 'number' ? data.total : comments.length;
    maxResults = typeof data.maxResults === 'number' ? data.maxResults : 0;
    const pageComments = Array.isArray(data.comments) ? data.comments : [];
    comments.push(...pageComments);

    const pageSize = maxResults > 0 ? maxResults : pageComments.length;
    if (comments.length >= total || pageSize === 0) {
      return {
        comments,
        total,
        maxResults,
        startAt: 0,
      };
    }
    startAt += pageSize;
  }
}

async function hydrateIssueComments(
  issues: JiraIssue[],
  config: AtlassianConfig,
  accessToken: string
): Promise<JiraIssue[]> {
  const hydratedIssues = await Promise.all(issues.map(async (issue) => {
    if (!isCommentsIncomplete(issue)) {
      return issue;
    }

    const comments = await fetchAllIssueComments(
      issue.key,
      config.cloudId,
      config.instanceUrl,
      accessToken
    );

    if (!comments) {
      return issue;
    }

    return {
      ...issue,
      fields: {
        ...issue.fields,
        comment: comments,
      },
    };
  }));

  return hydratedIssues;
}

export async function fetchJiraTickets(jql?: string): Promise<JiraSyncResult> {
  let config = await getAtlassianConfig();
  if (!config) {
    throw new Error('Atlassian configuration not found');
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('No valid access token available');
  }

  if (!config.cloudId && isJiraCloud(config.instanceUrl)) {
    const refreshed = await refreshCloudIdFromToken(config, accessToken);
    if (refreshed) config = refreshed;
  }

  const defaultJql = jql || 'assignee = currentUser() ORDER BY updated DESC';
  const searchUrl = buildSearchUrl(config.cloudId, config.instanceUrl, defaultJql);

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication failed. Please reconnect to JIRA.');
    }
    throw new Error(`Failed to fetch JIRA tickets: ${response.statusText}`);
  }

  const data: JiraSearchResponse = await response.json();
  const issuesWithComments = await hydrateIssueComments(data.issues, config, accessToken);
  const syncResult = await issuesToTickets(issuesWithComments, config);
  await recordHistoryTransaction({
    eventType: 'jira_sync_summary',
    summary: `JIRA sync: ${syncResult.created.length} created, ${syncResult.updated.length} updated, ${syncResult.deleted.length} removed`,
    jiraCreatedCount: syncResult.created.length,
    jiraUpdatedCount: syncResult.updated.length,
    jiraRemovedCount: syncResult.deleted.length,
    jiraCreatedTickets: syncResult.created.map(toTransactionTicketRef),
    jiraUpdatedTickets: syncResult.updated.map(toTransactionTicketRef),
    jiraRemovedTickets: syncResult.removedTickets.map(toTransactionTicketRef),
  });
  return syncResult;
}
