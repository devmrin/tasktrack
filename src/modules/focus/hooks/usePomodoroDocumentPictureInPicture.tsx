import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PomodoroTimer } from '@/modules/focus/components/PomodoroTimer';
import type { PomodoroPhase, PomodoroSettings } from '@/modules/focus/types';
import {
  getDocumentPictureInPicture,
  isDocumentPictureInPictureSupported,
  preparePictureInPictureDocument,
} from '@/modules/focus/utils/pictureInPictureDocument';

export type PomodoroDocumentPictureInPictureTimerProps = {
  readonly phase: PomodoroPhase;
  readonly display: string;
  readonly workContextLabel?: string;
  readonly running: boolean;
  readonly completedSessions: number;
  readonly settings: PomodoroSettings;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onReset: () => void;
  readonly onSwitchPhase: (phase: PomodoroPhase, autoStart?: boolean) => void;
};

export function usePomodoroDocumentPictureInPicture() {
  const pipWindowRef = useRef<Window | null>(null);
  const rootRef = useRef<Root | null>(null);
  const disposePageHideRef = useRef<(() => void) | null>(null);
  const disposedRef = useRef(true);
  const [isOpen, setIsOpen] = useState(false);
  const isSupported = useMemo(() => isDocumentPictureInPictureSupported(), []);

  const disposeInternals = useCallback(() => {
    disposePageHideRef.current?.();
    disposePageHideRef.current = null;
    rootRef.current?.unmount();
    rootRef.current = null;
    pipWindowRef.current = null;
  }, []);

  const dispose = useCallback(() => {
    if (disposedRef.current) return;
    disposedRef.current = true;
    disposeInternals();
    setIsOpen(false);
  }, [disposeInternals]);

  const closeWindow = useCallback(() => {
    const pipWin = pipWindowRef.current;
    dispose();
    try {
      pipWin?.close();
    } catch {
      /* window may already be closing */
    }
  }, [dispose]);

  const renderTimer = useCallback(
    (props: PomodoroDocumentPictureInPictureTimerProps) => {
      if (!rootRef.current) return;
      rootRef.current.render(
        <PomodoroTimer
          phase={props.phase}
          display={props.display}
          workContextLabel={props.workContextLabel}
          running={props.running}
          completedSessions={props.completedSessions}
          settings={props.settings}
          onStart={props.onStart}
          onPause={props.onPause}
          onReset={props.onReset}
          onSwitchPhase={props.onSwitchPhase}
          layout="documentPip"
          onCloseDocumentPictureInPicture={closeWindow}
        />,
      );
    },
    [closeWindow],
  );

  const open = useCallback(
    async (
      initialProps: PomodoroDocumentPictureInPictureTimerProps,
    ): Promise<boolean> => {
      const api = getDocumentPictureInPicture();
      if (!api) return false;

      if (pipWindowRef.current && rootRef.current) {
        renderTimer(initialProps);
        return true;
      }

      api.window?.close();

      try {
        const pipWindow = await api.requestWindow({
          width: 400,
          height: 520,
        });
        disposedRef.current = false;
        pipWindowRef.current = pipWindow;
        await preparePictureInPictureDocument(document, pipWindow.document);

        const mount = pipWindow.document.createElement('div');
        mount.id = 'pomodoro-document-pip-root';
        mount.className = 'min-h-screen w-full box-border';
        mount.style.minHeight = '100dvh';
        mount.style.width = '100%';
        mount.style.boxSizing = 'border-box';
        pipWindow.document.body.appendChild(mount);

        const root = createRoot(mount);
        rootRef.current = root;

        const onPageHide = () => {
          if (disposedRef.current) return;
          disposedRef.current = true;
          disposeInternals();
          setIsOpen(false);
        };

        pipWindow.addEventListener('pagehide', onPageHide);
        disposePageHideRef.current = () => {
          pipWindow.removeEventListener('pagehide', onPageHide);
        };

        root.render(
          <PomodoroTimer
            phase={initialProps.phase}
            display={initialProps.display}
            workContextLabel={initialProps.workContextLabel}
            running={initialProps.running}
            completedSessions={initialProps.completedSessions}
            settings={initialProps.settings}
            onStart={initialProps.onStart}
            onPause={initialProps.onPause}
            onReset={initialProps.onReset}
            onSwitchPhase={initialProps.onSwitchPhase}
            layout="documentPip"
            onCloseDocumentPictureInPicture={closeWindow}
          />,
        );
        setIsOpen(true);
        return true;
      } catch {
        disposedRef.current = true;
        disposeInternals();
        setIsOpen(false);
        return false;
      }
    },
    [closeWindow, disposeInternals, renderTimer],
  );

  useEffect(
    () => () => {
      closeWindow();
    },
    [closeWindow],
  );

  return useMemo(
    () => ({
      open,
      close: closeWindow,
      renderTimer,
      isOpen,
      isSupported,
    }),
    [open, closeWindow, renderTimer, isOpen, isSupported],
  );
}
