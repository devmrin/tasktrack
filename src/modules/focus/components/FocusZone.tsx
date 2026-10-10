import { useCallback, useEffect, useMemo } from 'react';
import type { useFocusZone } from '@/modules/focus/hooks/useFocusZone';
import { useDocumentTitle } from '@/modules/focus/hooks/useDocumentTitle';
import { usePomodoroSettings } from '@/modules/focus/hooks/usePomodoroSettings';
import { usePomodoroTimer } from '@/modules/focus/hooks/usePomodoroTimer';
import { getFocusWorkLabel } from '@/modules/focus/utils/focusWorkLabel';
import { useToast } from '@/hooks/useToast';
import { usePomodoroDocumentPictureInPicture } from '@/modules/focus/hooks/usePomodoroDocumentPictureInPicture';
import { FocusFullscreen } from './FocusFullscreen';
import { playPhaseCompletionSound } from '@/modules/focus/utils/playPhaseCompletionSound';

interface FocusZoneProps {
  readonly focusedData: ReturnType<typeof useFocusZone>['focusedData'];
  readonly onEndFocus: () => Promise<void>;
}

export function FocusZone({ focusedData, onEndFocus }: FocusZoneProps) {
  const { settings } = usePomodoroSettings();
  const { showToast } = useToast();
  const timer = usePomodoroTimer(settings, {
    onWorkComplete: () => {
      if (settings.chimeOnTimerComplete) playPhaseCompletionSound('work');
      showToast('Work session complete! Time for a break.');
    },
    onBreakComplete: () => {
      if (settings.chimeOnTimerComplete) playPhaseCompletionSound('break');
      showToast('Break over! Ready to focus?');
    },
  });
  const isFocused = focusedData !== null;
  const workContextLabel = useMemo(
    () => (focusedData ? getFocusWorkLabel(focusedData.ticket) : undefined),
    [focusedData],
  );
  useDocumentTitle(timer.display, timer.phase, isFocused, workContextLabel);
  const documentPip = usePomodoroDocumentPictureInPicture();

  const pomodoroDocumentPipProps = useMemo(
    () => ({
      phase: timer.phase,
      display: timer.display,
      workContextLabel,
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
      workContextLabel,
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
    await onEndFocus();
  }, [documentPip, focusedData, timer, onEndFocus]);

  if (!focusedData) {
    return null;
  }

  return (
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
      onExit={handleDismiss}
      onOpenDocumentPictureInPicture={
        documentPip.isSupported ? handleOpenDocumentPictureInPicture : undefined
      }
      documentPictureInPictureActive={documentPip.isOpen}
    />
  );
}
