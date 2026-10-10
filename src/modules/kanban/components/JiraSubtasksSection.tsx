import { Circle, CircleCheck, CircleDot, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import type { JiraSubtask, Ticket } from '@/db/database';
import { isJiraSubtaskDone } from '@/modules/tickets';

interface JiraSubtasksSectionProps {
  readonly subtasks: readonly JiraSubtask[];
  readonly jiraIssueUrl?: string;
  readonly tickets?: readonly Ticket[];
  readonly onOpenTicket: (ticket: Ticket) => void;
}

export function JiraSubtasksSection({
  subtasks,
  jiraIssueUrl,
  tickets,
  onOpenTicket,
}: JiraSubtasksSectionProps) {
  const ticketsByKey = useMemo(() => {
    const map = new Map<string, Ticket>();
    for (const ticket of tickets ?? []) {
      const key = ticket.jiraData?.jiraKey;
      if (key) {
        map.set(key, ticket);
      }
    }
    return map;
  }, [tickets]);
  const doneCount = subtasks.filter((subtask) => isJiraSubtaskDone(subtask)).length;
  const progress = subtasks.length === 0 ? 0 : Math.round((doneCount / subtasks.length) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Subtasks
        </span>
        <span
          className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          title={progressLabel(doneCount, subtasks.length)}
        >
          {doneCount}/{subtasks.length}
        </span>
      </div>
      <div
        className="mb-2 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={subtasks.length}
        aria-valuenow={doneCount}
        aria-label={progressLabel(doneCount, subtasks.length)}
      >
        <div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} />
      </div>
      <ul className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-700">
            <SubtaskRow
              subtask={subtask}
              jiraIssueUrl={jiraIssueUrl}
              localTicket={ticketsByKey.get(subtask.key)}
              onOpenTicket={onOpenTicket}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubtaskRow({
  subtask,
  jiraIssueUrl,
  localTicket,
  onOpenTicket,
}: {
  readonly subtask: JiraSubtask;
  readonly jiraIssueUrl?: string;
  readonly localTicket?: Ticket;
  readonly onOpenTicket: (ticket: Ticket) => void;
}) {
  const className = 'flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800';
  if (localTicket) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onOpenTicket(localTicket)}
        aria-label={`Open ${subtask.key}`}
      >
        <SubtaskRowContent subtask={subtask} />
      </button>
    );
  }

  const href = subtaskBrowseUrl(jiraIssueUrl, subtask.key);
  if (!href) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2">
        <SubtaskRowContent subtask={subtask} />
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open ${subtask.key} in JIRA`}
    >
      <SubtaskRowContent subtask={subtask} />
      <ExternalLink className="size-3 shrink-0 text-neutral-400" aria-hidden />
    </a>
  );
}

function SubtaskRowContent({ subtask }: { readonly subtask: JiraSubtask }) {
  const done = isJiraSubtaskDone(subtask);
  return (
    <>
      <SubtaskStatusIcon done={done} category={subtask.statusCategory} />
      <span className="shrink-0 text-xs font-medium text-blue-700 dark:text-blue-300">
        {subtask.key}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          done
            ? 'text-neutral-500 line-through dark:text-neutral-400'
            : 'text-neutral-800 dark:text-neutral-100'
        }`}
        title={subtask.summary}
      >
        {subtask.summary}
      </span>
      {subtask.assignee && (
        <span className="max-w-[5.5rem] shrink-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {subtask.assignee}
        </span>
      )}
      {subtask.status && (
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${statusClass(subtask.statusCategory, done)}`}>
          {subtask.status}
        </span>
      )}
    </>
  );
}

function SubtaskStatusIcon({
  done,
  category,
}: {
  readonly done: boolean;
  readonly category?: string;
}) {
  if (done) {
    return <CircleCheck className="size-3.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden />;
  }
  if (category === 'indeterminate') {
    return <CircleDot className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />;
  }
  return <Circle className="size-3.5 shrink-0 text-neutral-400" aria-hidden />;
}

function statusClass(category: string | undefined, done: boolean): string {
  if (done || category === 'done') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
  if (category === 'indeterminate') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
}

function progressLabel(done: number, total: number): string {
  const noun = total === 1 ? 'subtask' : 'subtasks';
  return `${done} of ${total} ${noun} done`;
}

function subtaskBrowseUrl(issueUrl: string | undefined, key: string): string | undefined {
  if (!issueUrl) {
    return undefined;
  }
  try {
    const url = new URL(issueUrl);
    const marker = '/browse/';
    const index = url.pathname.lastIndexOf(marker);
    if (index < 0) {
      return undefined;
    }
    url.pathname = `${url.pathname.slice(0, index)}${marker}${encodeURIComponent(key)}`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}
