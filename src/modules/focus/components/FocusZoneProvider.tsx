import { useEffect, type ReactNode } from 'react';
import { FocusZoneContext } from '@/modules/focus/contexts/focus-zone-context';
import { useFocusZoneState } from '@/modules/focus/hooks/useFocusZoneState';
import { FocusZone } from '@/modules/focus/components/FocusZone';
import { usePomodoroSettings } from '@/modules/focus/hooks/usePomodoroSettings';

interface FocusZoneProviderProps {
  readonly children: ReactNode;
}

export function FocusZoneProvider({ children }: FocusZoneProviderProps) {
  const {
    focusedData,
    focusActive,
    endFocus,
    ...rest
  } = useFocusZoneState();
  const { settings: focusSettings, loaded: focusSettingsLoaded } =
    usePomodoroSettings();
  const focusEnabled = focusSettings.enabled;

  useEffect(() => {
    if (!focusSettingsLoaded || focusEnabled || !focusActive) {
      return;
    }
    void endFocus();
  }, [focusSettingsLoaded, focusEnabled, focusActive, endFocus]);

  return (
    <FocusZoneContext.Provider
      value={{ focusedData, focusActive, endFocus, ...rest }}
    >
      {children}
      {focusSettingsLoaded && focusEnabled && (
        <FocusZone focusedData={focusedData} onEndFocus={endFocus} />
      )}
    </FocusZoneContext.Provider>
  );
}
