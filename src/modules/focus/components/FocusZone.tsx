import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { FOCUS_ZONE_COLLAPSED_HEIGHT, FOCUS_ZONE_EXPANDED_HEIGHT } from '@/modules/focus/constants';
import type { useFocusZone } from '@/modules/focus/hooks/useFocusZone';
import { useDocumentTitle } from '@/modules/focus/hooks/useDocumentTitle';
import { usePomodoroSettings } from '@/modules/focus/hooks/usePomodoroSettings';
import { usePomodoroTimer } from '@/modules/focus/hooks/usePomodoroTimer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useBoardTerminology } from '@/modules/boards/hooks/useBoardTerminology';
import { useToast } from '@/hooks/useToast';
import { usePomodoroDocumentPictureInPicture } from '@/modules/focus/hooks/usePomodoroDocumentPictureInPicture';
import { FocusFullscreen } from './FocusFullscreen';
import { FocusTicketCard } from './FocusTicketCard';
import { PomodoroTimer } from './PomodoroTimer';
import { PomodoroTimerPipPlaceholder } from './PomodoroTimerPipPlaceholder';
import { playTimerCompletionChime } from '@/modules/focus/utils/playTimerCompletionChime';

interface FocusZoneProps {
  readonly focusedData: ReturnType<typeof useFocusZone>['focusedData'];
  readonly onEndFocus: () => Promise<void>;
  readonly mode?: 'full' | 'hidden';
}

export function FocusZone({
  focusedData,
  onEndFocus,
  mode = 'full',
}: FocusZoneProps) {
  const { activeBoard } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const { settings } = usePomodoroSettings();
  const { showToast } = useToast();
  const timer = usePomodoroTimer(settings, {
    onWorkComplete: () => {
      if (settings.chimeOnTimerComplete) playTimerCompletionChime();
      showToast('Work session complete! Time for a break.');
    },
    onBreakComplete: () => {
      if (settings.chimeOnTimerComplete) playTimerCompletionChime();
      showToast('Break over! Ready to focus?');
    },
  });
  const isExpanded = focusedData !== null;
  const isMobileLayout = useMediaQuery('(max-width: 1023px)');
  useDocumentTitle(timer.display, timer.phase, isExpanded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const documentPip = usePomodoroDocumentPictureInPicture();

  const pomodoroDocumentPipProps = useMemo(
    () => ({
      phase: timer.phase,
      display: timer.display,
      running: timer.running,
      completedSessions: timer.completedSessions,
      settings,
      onStart: timer.start,
      onPause: timer.pause,
      onReset: timer.reset,
      onSwitchPhase: timer.switchPhase,
    }),
    [
      timer.phase,
      timer.display,
      timer.running,
      timer.completedSessions,
      settings,
      timer.start,
      timer.pause,
      timer.reset,
      timer.switchPhase,
    ],
  );

  useEffect(() => {
    if (!documentPip.isOpen) return;
    documentPip.renderTimer(pomodoroDocumentPipProps);
  }, [documentPip, pomodoroDocumentPipProps]);

  const handleOpenDocumentPictureInPicture = useCallback(() => {
    void (async () => {
      const ok = await documentPip.open(pomodoroDocumentPipProps);
      if (!ok) {
        showToast('Could not open picture-in-picture. Check browser support or try again.');
      }
    })();
  }, [documentPip, pomodoroDocumentPipProps, showToast]);

  const handleDismiss = useCallback(async () => {
    if (!focusedData) return;
    documentPip.close();
    timer.resetAll();
    setIsFullscreen(false);
    await onEndFocus();
  }, [documentPip, focusedData, timer, onEndFocus]);

  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  if (mode === 'hidden') {
    return (
      <>
        {isFullscreen && focusedData && (
          <FocusFullscreen
            ticket={focusedData.ticket}
            onDismiss={handleDismiss}
            phase={timer.phase}
            display={timer.display}
            running={timer.running}
            completedSessions={timer.completedSessions}
            settings={settings}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onSwitchPhase={timer.switchPhase}
            onExit={handleExitFullscreen}
            onOpenDocumentPictureInPicture={
              documentPip.isSupported ? handleOpenDocumentPictureInPicture : undefined
            }
            documentPictureInPictureActive={documentPip.isOpen}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
        style={{
          height: isExpanded
            ? isMobileLayout
              ? 'min(80vh, 46rem)'
              : FOCUS_ZONE_EXPANDED_HEIGHT
            : FOCUS_ZONE_COLLAPSED_HEIGHT,
        }}
      >
        {isExpanded ? (
          <div className="flex h-full min-h-0 flex-col lg:flex-row gap-3 lg:gap-6 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 overflow-y-auto overflow-x-hidden animate-in fade-in duration-200">
            <div className="order-2 lg:order-1 shrink-0 lg:flex-[3] min-h-0 min-w-0 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-700">
              <FocusTicketCard
                ticket={focusedData.ticket}
                onDismiss={handleDismiss}
              />
            </div>
            <div className="order-1 lg:order-2 flex min-h-0 min-w-0 flex-1 flex-col justify-center lg:flex-[2] lg:max-h-full">
              {documentPip.isOpen ? (
                <PomodoroTimerPipPlaceholder />
              ) : (
                <PomodoroTimer
                  phase={timer.phase}
                  display={timer.display}
                  running={timer.running}
                  completedSessions={timer.completedSessions}
                  settings={settings}
                  onStart={timer.start}
                  onPause={timer.pause}
                  onReset={timer.reset}
                  onSwitchPhase={timer.switchPhase}
                  onFullscreen={() => setIsFullscreen(true)}
                  onOpenDocumentPictureInPicture={
                    documentPip.isSupported ? handleOpenDocumentPictureInPicture : undefined
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center h-full px-3 sm:px-4 lg:px-6 gap-3">
            <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
              <Crosshair className="size-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Focus Zone</span>
            </div>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {`Click "Focus" on any ${terminology.item} on the board to begin`}
            </span>
          </div>
        )}
      </div>

      {isFullscreen && focusedData && (
        <FocusFullscreen
          ticket={focusedData.ticket}
          onDismiss={handleDismiss}
          phase={timer.phase}
          display={timer.display}
          running={timer.running}
          completedSessions={timer.completedSessions}
          settings={settings}
          onStart={timer.start}
          onPause={timer.pause}
          onReset={timer.reset}
          onSwitchPhase={timer.switchPhase}
          onExit={handleExitFullscreen}
          onOpenDocumentPictureInPicture={
            documentPip.isSupported ? handleOpenDocumentPictureInPicture : undefined
          }
          documentPictureInPictureActive={documentPip.isOpen}
        />
      )}
    </>
  );
}
