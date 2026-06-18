import { db, type Board } from '@/db/database';
import type { BoardExport } from '@/modules/boards/types/board.types';
import { DEFAULT_BOARD_ID } from '@/modules/boards/constants/board.constants';

const SETTINGS_ACCESS_TOKEN_KEY = 'atlassian_access_token';

async function settingsHasNonEmptyAccessToken(): Promise<boolean> {
  const row = await db.settings.get(SETTINGS_ACCESS_TOKEN_KEY);
  return typeof row?.value === 'string' && row.value.trim().length > 0;
}

export async function listBoards(): Promise<Board[]> {
  const boards = await db.boards.orderBy('order').toArray();
  return boards;
}

export async function getBoardById(id: string): Promise<Board | undefined> {
  return db.boards.get(id);
}

export async function getDefaultBoard(): Promise<Board | undefined> {
  return db.boards.filter((b) => b.isDefault).first();
}

async function reorderBoardOrdersFromList(boardsOrdered: Board[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.boards, async () => {
    for (const [index, board] of boardsOrdered.entries()) {
      if (board.order !== index) {
        await db.boards.update(board.id, {
          order: index,
          updatedAt: now,
        });
      }
    }
  });
}

/** Ensures boards table has at least one row (handles fresh IndexedDB installs that skip incremental upgrades). */
export async function ensureDefaultBoardBootstrap(): Promise<void> {
  const count = await db.boards.count();
  if (count > 0) {
    return;
  }

  const hasToken = await settingsHasNonEmptyAccessToken();
  const now = Date.now();
  await db.boards.add({
    id: DEFAULT_BOARD_ID,
    name: 'Board',
    order: 0,
    isDefault: true,
    jiraEnabled: hasToken,
    createdAt: now,
    updatedAt: now,
  });
}

const NEW_BOARD_COLUMNS = ['To Do', 'In Progress', 'Done'];

export async function createBoard(rawName: string): Promise<Board> {
  const trimmed = rawName.trim();
  if (!trimmed) {
    throw new Error('Board name cannot be empty');
  }

  const now = Date.now();
  const maxOrderBoard = await db.boards.orderBy('order').last();
  const nextOrderBoard = typeof maxOrderBoard?.order === 'number' ? maxOrderBoard.order + 1 : 0;

  const boardId = crypto.randomUUID();

  await db.transaction('rw', db.boards, db.columns, async () => {
    await db.boards.add({
      id: boardId,
      name: trimmed,
      order: nextOrderBoard,
      isDefault: false,
      jiraEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    let orderCol = 0;
    for (const title of NEW_BOARD_COLUMNS) {
      await db.columns.add({
        id: crypto.randomUUID(),
        boardId,
        title,
        order: orderCol,
        createdAt: now,
        updatedAt: now,
      });
      orderCol++;
    }
  });

  const created = await db.boards.get(boardId);
  if (!created) {
    throw new Error('Failed to create board');
  }
  return created;
}

export async function renameBoard(boardId: string, rawName: string): Promise<void> {
  const trimmed = rawName.trim();
  if (!trimmed) {
    throw new Error('Board name cannot be empty');
  }
  await db.boards.update(boardId, {
    name: trimmed,
    updatedAt: Date.now(),
  });
}

export async function setBoardJiraEnabled(boardId: string, enabled: boolean): Promise<void> {
  await db.boards.update(boardId, {
    jiraEnabled: enabled,
    updatedAt: Date.now(),
  });
}

export async function setDefaultBoard(boardId: string): Promise<void> {
  await db.transaction('rw', db.boards, async () => {
    const boards = await db.boards.toArray();
    const now = Date.now();
    for (const b of boards) {
      await db.boards.update(b.id, {
        isDefault: b.id === boardId,
        updatedAt: now,
      });
    }
  });
}

export async function reorderBoards(orderedIds: string[]): Promise<void> {
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) {
    throw new Error('Duplicate board ids in reorder list');
  }

  const boards = await db.boards.toArray();
  if (boards.length !== orderedIds.length) {
    throw new Error('Reorder list must include every board');
  }

  const byId = new Map(boards.map((b) => [b.id, b]));
  const reordered: Board[] = [];
  for (const id of orderedIds) {
    const b = byId.get(id);
    if (!b) {
      throw new Error('Unknown board id in reorder list');
    }
    reordered.push(b);
  }

  await reorderBoardOrdersFromList(reordered);
}

export async function deleteBoard(boardId: string): Promise<void> {
  const boards = await db.boards.toArray();
  if (boards.length <= 1) {
    throw new Error('Cannot delete the only board');
  }

  const target = boards.find((b) => b.id === boardId);
  if (!target) {
    throw new Error('Board not found');
  }
  if (target.isDefault) {
    throw new Error('Cannot delete the default board');
  }

  await db.transaction('rw', db.boards, db.columns, db.tickets, async () => {
    const columnIds = (await db.columns.where('boardId').equals(boardId).toArray()).map((c) => c.id);
    await db.tickets.where('boardId').equals(boardId).delete();
    if (columnIds.length > 0) {
      await db.columns.bulkDelete(columnIds);
    }
    await db.boards.delete(boardId);
  });

  const remaining = await db.boards.orderBy('order').toArray();
  await reorderBoardOrdersFromList(remaining);
}

export interface BoardStats {
  columnCount: number;
  ticketCount: number;
}

export async function getBoardStats(boardId: string): Promise<BoardStats> {
  const [columns, tickets] = await Promise.all([
    db.columns.where('boardId').equals(boardId).count(),
    db.tickets.where('boardId').equals(boardId).count(),
  ]);
  return { columnCount: columns, ticketCount: tickets };
}

export async function exportBoard(boardId: string): Promise<BoardExport> {
  const board = await db.boards.get(boardId);
  if (!board) {
    throw new Error('Board not found');
  }

  const columns = await db.columns.where('boardId').equals(boardId).sortBy('order');
  const tickets = await db.tickets.where('boardId').equals(boardId).toArray();

  return {
    exportedAt: Date.now(),
    version: 1,
    board,
    columns: columns.map((c) => ({
      id: c.id,
      title: c.title,
      order: c.order,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    tickets,
  };
}

export async function anyBoardHasJiraEnabled(): Promise<boolean> {
  const board = await db.boards.filter((b) => b.jiraEnabled).first();
  return board !== undefined;
}
