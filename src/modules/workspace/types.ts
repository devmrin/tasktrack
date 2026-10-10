export const BOARD_VIEWS = ['board', 'list', 'summary'] as const;

export type BoardView = (typeof BOARD_VIEWS)[number];

export function isBoardView(value: string): value is BoardView {
  return (BOARD_VIEWS as readonly string[]).includes(value);
}
