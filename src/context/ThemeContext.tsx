import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from '@/theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const darkColors = {
  ...lightColors,
  background: '#1A1420',
  surface: '#261E2E',
  surfaceAlt: '#32283D',
  surfaceDeep: '#3D314A',
  text: '#F0E8F5',
  textMuted: '#9A8FA8',
  ink: '#FFFFFF',
  border: '#3D314A',
  borderLight: '#32283D',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.4)',
} as unknown as typeof lightColors;

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  colors: typeof lightColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'boutikplus_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // ignore
    }
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const isDark = resolved === 'dark';

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        resolved,
        colors: isDark ? darkColors : lightColors,
        isDark,
        setMode,
        toggle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
