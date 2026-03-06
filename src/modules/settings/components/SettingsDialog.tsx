import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Paintbrush, Plug, Timer, Keyboard, History } from 'lucide-react';
import { AppearanceSettings } from './AppearanceSettings';
import { JiraSettings } from './JiraSettings';
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings';
import { HistorySettings } from './HistorySettings';
import { FocusSettings } from '@/modules/focus/components/FocusSettings';

export type SectionId = 'appearance' | 'focus' | 'jira' | 'keyboard' | 'history';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: 'Preferences',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Paintbrush },
      { id: 'focus', label: 'Focus', icon: Timer },
      { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Keyboard },
      { id: 'history', label: 'History', icon: History },
    ],
  },
  {
    heading: 'Integrations',
    items: [{ id: 'jira', label: 'JIRA', icon: Plug }],
  },
];

const SECTION_TITLES: Record<SectionId, string> = {
  appearance: 'Appearance',
  focus: 'Focus',
  jira: 'JIRA',
  keyboard: 'Keyboard Shortcuts',
  history: 'History',
};

function SectionContent({ section }: { readonly section: SectionId }) {
  switch (section) {
    case 'appearance':
      return <AppearanceSettings />;
    case 'focus':
      return <FocusSettings />;
    case 'jira':
      return <JiraSettings />;
    case 'keyboard':
      return <KeyboardShortcutsSettings />;
    case 'history':
      return <HistorySettings />;
  }
}

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly initialSection?: SectionId;
}

export function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection ?? 'appearance');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl h-[80vh] max-h-[600px] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex overflow-hidden focus:outline-none">
          {/* Left sidebar */}
          <nav className="w-52 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4 flex flex-col">
            <Dialog.Title className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">
              Settings
            </Dialog.Title>

            <div className="space-y-4 flex-1">
              {SECTIONS.map((section) => (
                <div key={section.heading}>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-2 mb-1">
                    {section.heading}
                  </span>
                  {section.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`
                          w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                          ${
                            isActive
                              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }
                        `}
                      >
                        <item.icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              Crafted with ♥ by{' '}
              <a
                href="https://mrinmay.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                Mrinmay
              </a>
            </p>
          </nav>

          {/* Right content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {SECTION_TITLES[activeSection]}
              </h2>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                  aria-label="Close settings"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <SectionContent section={activeSection} />
            </div>
          </div>

          <Dialog.Description className="sr-only">
            Application settings and preferences
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
