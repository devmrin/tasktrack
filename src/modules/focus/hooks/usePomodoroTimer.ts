import { useCallback, useEffect, useRef, useState } from 'react';
import type { PomodoroPhase, PomodoroSettings } from '@/modules/focus/types';

function phaseToSeconds(phase: PomodoroPhase, settings: PomodoroSettings): number {
  switch (phase) {
    case 'work':
      return settings.workDuration * 60;
    case 'shortBreak':
      return settings.shortBreakDuration * 60;
    case 'longBreak':
      return settings.longBreakDuration * 60;
  }
}

interface TimerCallbacks {
  onWorkComplete?: () => void;
  onBreakComplete?: () => void;
}

interface TimerState {
  phase: PomodoroPhase;
  timeRemaining: number;
  running: boolean;
  completedSessions: number;
}

export function usePomodoroTimer(settings: PomodoroSettings, callbacks?: TimerCallbacks) {
  const [state, setState] = useState<TimerState>(() => ({
    phase: 'work',
    timeRemaining: phaseToSeconds('work', settings),
    running: false,
    completedSessions: 0,
  }));

  const [prevDurations, setPrevDurations] = useState({
    work: settings.workDuration,
    short: settings.shortBreakDuration,
    long: settings.longBreakDuration,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  const callbacksRef = useRef(callbacks);
  /** Wall-clock timestamp (ms) when the current phase ends. Set on start, cleared on pause/reset. */
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const prevPhaseRef = useRef<PomodoroPhase>('work');

  useEffect(() => {
    const currentPhase = state.phase;
    const prevPhase = prevPhaseRef.current;

    if (currentPhase !== prevPhase) {
      if (prevPhase === 'work' && (currentPhase === 'shortBreak' || currentPhase === 'longBreak')) {
        callbacksRef.current?.onWorkComplete?.();
      } else if ((prevPhase === 'shortBreak' || prevPhase === 'longBreak') && currentPhase === 'work') {
        callbacksRef.current?.onBreakComplete?.();
      }
      prevPhaseRef.current = currentPhase;
    }
  }, [state.phase]);

  const durationsChanged =
    settings.workDuration !== prevDurations.work ||
    settings.shortBreakDuration !== prevDurations.short ||
    settings.longBreakDuration !== prevDurations.long;

  if (durationsChanged) {
    setPrevDurations({
      work: settings.workDuration,
      short: settings.shortBreakDuration,
      long: settings.longBreakDuration,
    });
    if (!state.running) {
      setState((prev) => ({
        ...prev,
        timeRemaining: phaseToSeconds(prev.phase, settings),
      }));
    }
  }

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      endTimeRef.current = Date.now() + prev.timeRemaining * 1000;
      return { ...prev, running: true };
    });
  }, []);

  const pause = useCallback(() => {
    const endTime = endTimeRef.current;
    endTimeRef.current = null;
    clearTimer();
    setState((prev) => {
      const remaining =
        endTime === null
          ? prev.timeRemaining
          : Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      return { ...prev, running: false, timeRemaining: remaining };
    });
  }, [clearTimer]);

  const switchPhase = useCallback(
    (newPhase: PomodoroPhase, autoStart = false) => {
      clearTimer();
      const duration = phaseToSeconds(newPhase, settingsRef.current);
      endTimeRef.current = autoStart ? Date.now() + duration * 1000 : null;
      setState((prev) => ({
        ...prev,
        phase: newPhase,
        timeRemaining: duration,
        running: autoStart,
      }));
    },
    [clearTimer],
  );

  const reset = useCallback(() => {
    clearTimer();
    endTimeRef.current = null;
    setState((prev) => ({
      ...prev,
      timeRemaining: phaseToSeconds(prev.phase, settingsRef.current),
      running: false,
    }));
  }, [clearTimer]);

  const resetAll = useCallback(() => {
    clearTimer();
    endTimeRef.current = null;
    setState({
      phase: 'work',
      timeRemaining: phaseToSeconds('work', settingsRef.current),
      running: false,
      completedSessions: 0,
    });
  }, [clearTimer]);

  useEffect(() => {
    if (!state.running) {
      clearTimer();
      return;
    }

    const tick = () => {
      const endTime = endTimeRef.current;
      if (endTime === null) return;

      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        clearTimer();
        const currentSettings = settingsRef.current;

        setState((prev) => {
          if (prev.phase === 'work') {
            const newCount = prev.completedSessions + 1;
            const isLongBreak = newCount % currentSettings.longBreakInterval === 0;
            const nextPhase: PomodoroPhase = isLongBreak ? 'longBreak' : 'shortBreak';
            const nextDuration = phaseToSeconds(nextPhase, currentSettings);
            const autoStart = currentSettings.autoStartBreaks;
            endTimeRef.current = autoStart ? Date.now() + nextDuration * 1000 : null;

            return {
              phase: nextPhase,
              timeRemaining: nextDuration,
              running: autoStart,
              completedSessions: newCount,
            };
          }

          const nextDuration = phaseToSeconds('work', currentSettings);
          const autoStart = currentSettings.autoStartPomodoros;
          endTimeRef.current = autoStart ? Date.now() + nextDuration * 1000 : null;

          return {
            ...prev,
            phase: 'work',
            timeRemaining: nextDuration,
            running: autoStart,
          };
        });
        return;
      }

      setState((prev) => {
        if (prev.timeRemaining === remaining) return prev;
        return { ...prev, timeRemaining: remaining };
      });
    };

    intervalRef.current = setInterval(tick, 500);

    return clearTimer;
  }, [state.running, clearTimer]);

  const minutes = Math.floor(state.timeRemaining / 60);
  const seconds = state.timeRemaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    phase: state.phase,
    timeRemaining: state.timeRemaining,
    display,
    running: state.running,
    completedSessions: state.completedSessions,
    start,
    pause,
    reset,
    resetAll,
    switchPhase,
  };
}
