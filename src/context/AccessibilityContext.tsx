import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@boutikplus/accessibility';

export interface AccessibilitySettings {
  largeIcons: boolean;
  audioMode: boolean;
  lowDataMode: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  toggleLargeIcons: () => void;
  toggleAudioMode: () => void;
  toggleLowDataMode: () => void;
  iconSize: number;
  iconSizeLarge: number;
  touchSize: number;
}

const defaults: AccessibilitySettings = {
  largeIcons: false,
  audioMode: false,
  lowDataMode: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaults);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      })
      .catch((err) => console.error('[Accessibility] Échec chargement paramètres:', err));
  }, []);

  const persist = useCallback((next: AccessibilitySettings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((err) =>
      console.error('[Accessibility] Échec sauvegarde paramètres:', err)
    );
  }, []);

  const toggleLargeIcons = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, largeIcons: !prev.largeIcons };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleAudioMode = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, audioMode: !prev.audioMode };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleLowDataMode = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, lowDataMode: !prev.lowDataMode };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value: AccessibilityContextValue = {
    ...settings,
    toggleLargeIcons,
    toggleAudioMode,
    toggleLowDataMode,
    iconSize: settings.largeIcons ? 28 : 20,
    iconSizeLarge: settings.largeIcons ? 44 : 32,
    touchSize: settings.largeIcons ? 56 : 44,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility doit être utilisé dans <AccessibilityProvider>');
  }
  return ctx;
}
