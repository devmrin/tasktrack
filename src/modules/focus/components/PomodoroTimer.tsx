import { useContext } from 'react';
import {
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import { SettingsContext } from '@/contexts/settings-context';
import type { PomodoroPhase, PomodoroSettings } from '@/modules/focus/types';
import { isDocumentPictureInPictureSupported } from '@/modules/focus/utils/pictureInPictureDocument';

interface PomodoroTimerProps {
  readonly phase: PomodoroPhase;
  readonly display: string;
  /** Shown during work phase (e.g. JIRA key or ticket title). */
  readonly workContextLabel?: string;
  readonly running: boolean;
  readonly completedSessions: number;
  readonly settings: PomodoroSettings;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onReset: () => void;
  readonly onSwitchPhase: (phase: PomodoroPhase, autoStart?: boolean) => void;
  readonly onFullscreen?: () => void;
  readonly layout?: 'default' | 'documentPip';
  readonly onCloseDocumentPictureInPicture?: () => void;
  readonly onOpenDocumentPictureInPicture?: () => void;
}

const PHASE_TABS: Array<{ id: PomodoroPhase; label: string }> = [
  { id: 'work', label: 'Pomodoro' },
  { id: 'shortBreak', label: 'Short Break' },
  { id: 'longBreak', label: 'Long Break' },
];

const PHASE_COLORS: Record<PomodoroPhase, { bg: string; accent: string }> = {
  work: {
    bg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
    accent: 'text-yellow-600 dark:text-yellow-400',
  },
  shortBreak: {
    bg: 'bg-lime-500/10 dark:bg-lime-500/15',
    accent: 'text-lime-600 dark:text-lime-400',
  },
  longBreak: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    accent: 'text-violet-600 dark:text-violet-400',
  },
};

export function PomodoroTimer({
  phase,
  display,
  workContextLabel,
  running,
  completedSessions,
  settings,
  onStart,
  onPause,
  onReset,
  onSwitchPhase,
  onFullscreen,
  layout = 'default',
  onCloseDocumentPictureInPicture,
  onOpenDocumentPictureInPicture,
}: PomodoroTimerProps) {
  const colors = PHASE_COLORS[phase];
  const workPhaseCaption = workContextLabel ?? 'Time to focus!';
  const settingsContext = useContext(SettingsContext);
  const showDocumentPipButton =
    layout === 'default' &&
    isDocumentPictureInPictureSupported() &&
    onOpenDocumentPictureInPicture !== undefined;

  const rootLayoutClass =
    layout === 'documentPip'
      ? `${colors.bg} relative flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center box-border rounded-xl p-4 sm:p-6`
      : `${colors.bg} relative flex h-full min-h-0 flex-col items-center justify-center rounded-xl p-4 sm:p-6`;

  return (
    <div className={rootLayoutClass}>
      {layout === 'documentPip' && onCloseDocumentPictureInPicture ? (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onCloseDocumentPictureInPicture}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-neutral-700/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-600 shadow-sm border border-white/50 dark:border-neutral-600/50 transition-all"
            aria-label="Close picture-in-picture window"
            title="Close picture-in-picture"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {layout === 'default' && (onFullscreen !== undefined || showDocumentPipButton) ? (
        <div className="absolute top-3 right-3 flex flex-col items-center gap-1.5">
          {onFullscreen !== undefined && settingsContext ? (
            <Tooltip content="Focus settings" side="left">
              <button
                type="button"
                onClick={() => settingsContext.openSettings('focus')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-neutral-700/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-600 shadow-sm border border-white/50 dark:border-neutral-600/50 transition-all"
                aria-label="Open focus settings"
              >
                <Settings className="size-3.5" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {showDocumentPipButton && onOpenDocumentPictureInPicture ? (
            <Tooltip content="Picture-in-picture" side="left">
              <button
                type="button"
                onClick={onOpenDocumentPictureInPicture}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-neutral-700/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-600 shadow-sm border border-white/50 dark:border-neutral-600/50 transition-all"
                aria-label="Open timer in picture-in-picture"
              >
                <PictureInPicture2 className="size-3.5" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {onFullscreen !== undefined ? (
            <Tooltip content="Fullscreen" side="left">
              <button
                type="button"
                onClick={onFullscreen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/70 dark:bg-neutral-700/70 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-600 shadow-sm border border-white/50 dark:border-neutral-600/50 transition-all"
                aria-label="Enter fullscreen focus mode"
              >
                <Maximize2 className="size-3.5" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-1">
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSwitchPhase(tab.id)}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-colors ${
              phase === tab.id
                ? 'bg-white/90 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`text-5xl sm:text-6xl font-bold tabular-nums tracking-tight ${colors.accent} select-none`}>
        {display}
      </div>

      <div className="mt-5 flex flex-row flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={running ? onPause : onStart}
          className="flex items-center gap-2 px-6 sm:px-8 py-2.5 rounded-lg bg-white/90 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold text-sm shadow-sm hover:bg-white dark:hover:bg-neutral-600 transition-colors"
        >
          {running ? (
            <>
              <Pause className="size-4" aria-hidden />
              PAUSE
            </>
          ) : (
            <>
              <Play className="size-4" aria-hidden />
              START
            </>
          )}
        </button>
        {layout === 'documentPip' ? (
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50 transition-colors"
            aria-label="Reset timer"
            title="Reset timer"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        ) : (
          <Tooltip content="Reset timer" side="bottom">
            <button
              type="button"
              onClick={onReset}
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50 transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </Tooltip>
        )}
      </div>

      <footer className="mt-4 text-center">
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {phase === 'work' && (
            <>
              <span className="shrink-0">
                Session {completedSessions + 1} of {settings.longBreakInterval}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
                ·
              </span>
              <span className="min-w-0 max-w-[min(85vw,24rem)] truncate" title={workPhaseCaption}>
                {workPhaseCaption}
              </span>
            </>
          )}
          {phase === 'shortBreak' && (
            <>
              {completedSessions > 0 ? (
                <>
                  {completedSessions} of {settings.longBreakInterval} done
                  <span className="mx-1.5 text-neutral-400 dark:text-neutral-500">·</span>
                </>
              ) : null}
              Short break
            </>
          )}
          {phase === 'longBreak' && (
            <>
              All {settings.longBreakInterval} complete
              <span className="mx-1.5 text-neutral-400 dark:text-neutral-500">·</span>
              Long break
            </>
          )}
        </p>
      </footer>

      {completedSessions > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: Math.min(completedSessions, settings.longBreakInterval) }).map(
            (_, i) => (
              <div
                key={`session-${phase}-${i}`}
                className={`size-2 rounded-full ${colors.accent} opacity-60`}
                style={{ backgroundColor: 'currentColor' }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
