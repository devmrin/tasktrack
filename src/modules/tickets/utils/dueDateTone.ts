export type DueDateTone = 'urgent' | 'soon' | 'normal';

const DAY_MS = 24 * 60 * 60 * 1000;
const URGENT_WITHIN_DAYS = 1;
const SOON_WITHIN_DAYS = 4;

function parseDueDateMs(dueDate: string): number | null {
  const match = dueDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export function getDueDateTone(
  dueDate: string | undefined,
  today: Date = new Date(),
): DueDateTone | undefined {
  if (!dueDate) {
    return undefined;
  }

  const dueMs = parseDueDateMs(dueDate);
  if (dueMs === null) {
    return undefined;
  }

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  // Round so a 23h or 25h local day still counts as one calendar day.
  const daysUntil = Math.round((dueMs - todayStart) / DAY_MS);

  if (daysUntil <= URGENT_WITHIN_DAYS) {
    return 'urgent';
  }
  if (daysUntil <= SOON_WITHIN_DAYS) {
    return 'soon';
  }
  return 'normal';
}
