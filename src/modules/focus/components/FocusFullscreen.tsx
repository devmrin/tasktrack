import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minimize2, Moon, Sun } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import { useTheme } from '@/hooks/useTheme';
import type { Ticket } from '@/db/database';
import type { PomodoroPhase, PomodoroSettings } from '@/modules/focus/types';
import { getFocusWorkLabel } from '@/modules/focus/utils/focusWorkLabel';
import { FocusTicketCard } from './FocusTicketCard';
import { PomodoroTimer } from './PomodoroTimer';
import { PomodoroTimerPipPlaceholder } from './PomodoroTimerPipPlaceholder';

interface FocusFullscreenProps {
  readonly ticket: Ticket;
  readonly onDismiss: () => void;
  readonly phase: PomodoroPhase;
  readonly display: string;
  readonly running: boolean;
  readonly completedSessions: number;
  readonly settings: PomodoroSettings;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onReset: () => void;
  readonly onSwitchPhase: (phase: PomodoroPhase, autoStart?: boolean) => void;
  readonly onExit: () => void;
  readonly onOpenDocumentPictureInPicture?: () => void;
  readonly documentPictureInPictureActive?: boolean;
}

const PHASE_BACKGROUNDS: Record<PomodoroPhase, string> = {
  work: 'bg-neutral-100 dark:bg-neutral-950',
  shortBreak: 'bg-neutral-100 dark:bg-neutral-950',
  longBreak: 'bg-neutral-100 dark:bg-neutral-950',
};

export function FocusFullscreen({
  ticket,
  onDismiss,
  phase,
  display,
  running,
  completedSessions,
  settings,
  onStart,
  onPause,
  onReset,
  onSwitchPhase,
  onExit,
  onOpenDocumentPictureInPicture,
  documentPictureInPictureActive = false,
}: FocusFullscreenProps) {
  const [isClosing, setIsClosing] = useState(false);
  const { theme, setTheme } = useTheme();
  const workContextLabel = getFocusWorkLabel(ticket);

  const handleClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const timeout = globalThis.setTimeout(onExit, 200);
    return () => globalThis.clearTimeout(timeout);
  }, [isClosing, onExit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown, true);
    return () => globalThis.removeEventListener('keydown', handleKeyDown, true);
  }, [handleClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const background = PHASE_BACKGROUNDS[phase];
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return createPortal(
    <dialog
      open
      className={`focus-fullscreen-overlay fixed inset-0 z-[200] ${background} ${isClosing ? 'focus-fullscreen-exit' : 'focus-fullscreen-enter'} w-full h-full max-w-none max-h-none m-0 p-0 border-none`}
      aria-label="Focus mode fullscreen"
    >
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10">
        <Tooltip content="Toggle theme" side="bottom">
          <button
            type="button"
            onClick={() => setTheme(nextTheme)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-all shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="size-3.5" aria-hidden />
            ) : (
              <Sun className="size-3.5" aria-hidden />
            )}
          </button>
        </Tooltip>
      </div>
      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-all shadow-sm"
          aria-label="Exit fullscreen"
        >
          <Minimize2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      <div className="flex h-full items-center justify-center overflow-y-auto px-3 sm:px-6 lg:px-8 py-16 sm:py-12">
        <div className="flex h-full w-full max-w-6xl flex-col lg:flex-row gap-3 sm:gap-6 lg:gap-8 lg:max-h-[600px]">
          <div className="flex-1 lg:flex-[3] min-w-0 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-neutral-200/50 dark:border-neutral-700/50 shadow-lg">
            <FocusTicketCard
              ticket={ticket}
              onDismiss={onDismiss}
            />
          </div>

          <div className="flex-1 lg:flex-[2] min-w-0">
            {documentPictureInPictureActive ? (
              <PomodoroTimerPipPlaceholder />
            ) : (
              <PomodoroTimer
                phase={phase}
                display={display}
                workContextLabel={workContextLabel}
                running={running}
                completedSessions={completedSessions}
                settings={settings}
                onStart={onStart}
                onPause={onPause}
                onReset={onReset}
                onSwitchPhase={onSwitchPhase}
                onOpenDocumentPictureInPicture={onOpenDocumentPictureInPicture}
              />
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 px-3 text-center">
        <span className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-500 select-none">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">Esc</kbd> to exit
        </span>
      </div>
    </dialog>,
    document.body,
  );
}
