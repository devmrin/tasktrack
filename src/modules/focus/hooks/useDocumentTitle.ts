import { useEffect, useRef } from 'react';
import type { PomodoroPhase } from '@/modules/focus/types';

function phaseMessage(phase: PomodoroPhase, workLabel?: string): string {
  if (phase === 'work') {
    return workLabel ?? 'Time to focus!';
  }
  return 'Time for a break!';
}

export function useDocumentTitle(
  display: string,
  phase: PomodoroPhase,
  isActive: boolean,
  workLabel?: string,
): void {
  const originalTitleRef = useRef(document.title);

  useEffect(() => {
    const savedTitle = originalTitleRef.current;
    if (!isActive) {
      document.title = savedTitle;
      return;
    }
    document.title = `${display} - ${phaseMessage(phase, workLabel)}`;
    return () => {
      document.title = savedTitle;
    };
  }, [display, phase, isActive, workLabel]);
}
