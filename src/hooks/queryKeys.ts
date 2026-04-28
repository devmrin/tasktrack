export const queryKeys = {
  boards: ['boards'] as const,
  columns: (boardId: string) => ['columns', boardId] as const,
  tickets: {
    all: (boardId: string) => ['tickets', boardId] as const,
    column: (boardId: string, columnId: string) =>
      ['tickets', boardId, 'column', columnId] as const,
    jira: (boardId: string) => ['tickets', boardId, 'jira'] as const,
    inbox: (boardId: string) => ['tickets', boardId, 'inbox'] as const,
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
