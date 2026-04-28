import { useEffect } from 'react';

/**
 * Registers global keydown shortcuts. Shortcut chords are matched with modifier flags;
 * omitting `shiftKey` / `ctrlKey` / `metaKey` requires those modifiers to be **off**.
 *
 * App shortcuts (registered in `routes/__root.tsx`) include Search (⌘K), Settings (⌘.),
 * sidebar (⌘\\), theme (⌘⇧M), Quick open JIRA / Sync JIRA when the active board has JIRA enabled (⌘J / ⌘⇧J),
 * and new local ticket or task (⌘⇧C) following each board’s wording.
 */

interface ShortcutConfig {
  readonly key: string;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
  readonly handler: (e: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: readonly ShortcutConfig[]): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
