export type StatusFilterOperator = 'equals' | 'notEquals';

export interface StatusFilter {
  readonly operator: StatusFilterOperator;
  readonly statuses: readonly string[];
}

export const EMPTY_STATUS_FILTER: StatusFilter = {
  operator: 'equals',
  statuses: [],
};

interface StatusCarrier {
  readonly jiraData?: {
    readonly status?: string;
  };
}

export function isStatusFilterActive(filter: StatusFilter): boolean {
  return filter.statuses.length > 0;
}

export function ticketStatus(ticket: StatusCarrier): string | undefined {
  const status = ticket.jiraData?.status?.trim();
  return status ? status : undefined;
}

export function ticketMatchesStatusFilter(
  ticket: StatusCarrier,
  filter: StatusFilter,
): boolean {
  if (!isStatusFilterActive(filter)) {
    return true;
  }

  const status = ticketStatus(ticket);
  const matches = status !== undefined && filter.statuses.includes(status);
  return filter.operator === 'equals' ? matches : !matches;
}

export function collectStatusOptions(
  tickets: readonly StatusCarrier[],
  selected: readonly string[],
): string[] {
  const names = new Set<string>();
  for (const ticket of tickets) {
    const status = ticketStatus(ticket);
    if (status) {
      names.add(status);
    }
  }
  for (const status of selected) {
    const trimmed = status.trim();
    if (trimmed) {
      names.add(trimmed);
    }
  }
  return [...names].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  );
}

export function formatStatusFilterSummary(filter: StatusFilter): string {
  const symbol = filter.operator === 'equals' ? '=' : '!=';
  return `Status ${symbol} ${filter.statuses.join(', ')}`;
}

export function parseStatusFilter(value: unknown): StatusFilter {
  if (!value || typeof value !== 'object') {
    return EMPTY_STATUS_FILTER;
  }

  const record = value as { operator?: unknown; statuses?: unknown };
  const operator: StatusFilterOperator =
    record.operator === 'notEquals' ? 'notEquals' : 'equals';
  if (!Array.isArray(record.statuses)) {
    return { operator, statuses: [] };
  }

  const statuses: string[] = [];
  const seen = new Set<string>();
  for (const entry of record.statuses) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    statuses.push(trimmed);
  }
  return { operator, statuses };
}

export function readStatusFilterStore(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
