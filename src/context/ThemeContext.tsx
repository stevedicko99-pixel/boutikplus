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
  // ── Dark mode « Nuit chaude » : tons chauds (terracotta atténué), pas violets génériques ──
  background: '#0F0D0B',          // noir chaud profond
  surface: '#1A1612',            // brun très foncé, neutre chaud
  surfaceAlt: '#241F1A',         // brun chaud pour éléments secondaires
  surfaceDeep: '#2E2823',        // brun chaud plus profond
  surfaceElevated: '#221C17',    // cartes surélevées
  surfaceSunken: '#1A1612',
  ink: '#FFFFFF',
  text: '#F2EBE2',               // crème douce, pas violet
  textMuted: '#A29488',           // brun chaud atténué
  textSubtle: '#7A6E62',
  textInverse: '#1A1410',
  border: '#2E2823',
  borderLight: '#241F1A',
  borderStrong: '#3F3628',
  // Accent sarcelle conservé (lisible sur fond sombre)
  accent: '#3AA6A5',              // version plus claire pour contraste dark
  accentLight: '#5BC4C3',
  accentSurface: '#0A2A2A',
  accentText: '#5BC4C3',
  // Semantic : versions plus lumineuses pour dark mode
  success: '#3CB371',
  warning: '#F0B440',
  danger: '#F06464',
  info: '#3AA6A5',
  successSurface: '#0F2820',
  warningSurface: '#28210A',
  dangerSurface: '#2A1410',
  infoSurface: '#0A2A2A',
  // Brand & paiements
  promo: '#FF6B5A',
  primary: '#E8916B',            // terracotta plus claire en dark pour contraste
  primaryLight: '#F2A98A',
  primaryDark: '#C24A1E',
  primaryDeep: '#9B3A18',
  gold: '#E6C466',
  goldLight: '#F0D088',
  glass: 'rgba(26,22,18,0.74)',
  glassStrong: 'rgba(26,22,18,0.88)',
  glow: 'rgba(232,145,107,0.30)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.5)',
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
