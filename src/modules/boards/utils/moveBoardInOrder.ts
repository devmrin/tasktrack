export function moveBoardInOrder(
  orderedIds: readonly string[],
  boardId: string,
  direction: -1 | 1,
): string[] | null {
  const index = orderedIds.indexOf(boardId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= orderedIds.length) {
    return null;
  }

  const next = [...orderedIds];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) {
    return null;
  }
  next.splice(target, 0, moved);
  return next;
}
