const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');

export const MOD_KEY = isMac ? '⌘' : 'Ctrl';
const SHIFT_KEY = isMac ? '⇧' : 'Shift';

function formatKey(key: string): string {
  if (key === 'Shift') return SHIFT_KEY;
  return key;
}

/** Format shortcut keys for display in tooltips (e.g. "⌘K" or "Ctrl+Shift+J") */
export function formatShortcut(keys: readonly string[]): string {
  const sep = isMac ? '' : '+';
  return keys.map(formatKey).join(sep);
}

export const SHORTCUT_DISPLAY = {
  search: formatShortcut([MOD_KEY, 'K']),
  settings: formatShortcut([MOD_KEY, '.']),
  toggleSidebar: formatShortcut([MOD_KEY, '\\']),
  toggleTheme: formatShortcut([MOD_KEY, 'Shift', 'M']),
  jiraQuickOpen: formatShortcut([MOD_KEY, 'J']),
  syncJira: formatShortcut([MOD_KEY, 'Shift', 'J']),
  newLocalTicket: formatShortcut([MOD_KEY, 'Shift', 'C']),
} as const;
