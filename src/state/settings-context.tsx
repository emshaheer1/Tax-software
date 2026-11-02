import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultSettings, type Settings } from '../engine/brackets.ts';
import { loadSettings, saveSettings } from './storage.ts';

interface SettingsApi {
  settings: Settings;
  resetEpoch: number;
  setSettings: (settings: Settings) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [resetEpoch, setResetEpoch] = useState(0);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings());
    setResetEpoch((epoch) => epoch + 1);
  }, []);

  const api = useMemo(
    () => ({ settings, resetEpoch, setSettings, updateSettings, resetSettings }),
    [settings, resetEpoch, updateSettings, resetSettings],
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used within SettingsProvider');
  return value;
}
