export const queryKeys = {
  columns: ['columns'] as const,
  tickets: {
    all: ['tickets'] as const,
    column: (columnId: string) => ['tickets', 'column', columnId] as const,
    jira: ['tickets', 'jira'] as const,
    inbox: ['tickets', 'inbox'] as const,
  },
  atlassian: {
    config: ['atlassian', 'config'] as const,
    connection: ['atlassian', 'connection'] as const,
  },
  history: {
    all: ['history'] as const,
    list: (dateRange: string) => ['history', dateRange] as const,
  },
} as const;
