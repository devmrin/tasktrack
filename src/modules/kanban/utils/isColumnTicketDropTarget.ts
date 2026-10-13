interface OverDropTarget {
  readonly type: unknown;
  readonly columnId: unknown;
}

export function isColumnTicketDropTarget(
  columnId: string,
  isTicketDragActive: boolean,
  isColumnDroppableOver: boolean,
  overTarget: OverDropTarget | null,
): boolean {
  if (!isTicketDragActive) {
    return false;
  }
  if (isColumnDroppableOver) {
    return true;
  }
  return overTarget?.type === "ticket" && overTarget.columnId === columnId;
}
