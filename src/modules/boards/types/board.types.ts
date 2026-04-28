import type { Board } from '@/db/database';

export interface BoardExport {
  exportedAt: number;
  version: 1;
  board: Board;
  columns: Array<{
    id: string;
    title: string;
    order: number;
    createdAt: number;
    updatedAt: number;
  }>;
  tickets: import('@/db/database').Ticket[];
}

/** User-facing wording derived from connectors (MVP: JIRA on/off). */
export interface BoardTerminology {
  item: string;
  Item: string;
  items: string;
  Items: string;
}
