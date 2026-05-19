/** Absolute timestamp for tooltips (e.g. "5 May 2026, 14:30"). */
export function formatAbsoluteTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Human-friendly relative time (e.g. "now", "5m ago", "1hr ago", "2 days ago").
 */
export function formatRelativeTimeAgo(isoString: string, now: Date = new Date()): string {
  const date = new Date(isoString);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) {
    return 'now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}hr ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
