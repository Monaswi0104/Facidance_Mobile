import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------
const lightColors = {
  background: '#ffffff',
  foreground: '#0f172a',
  primary: '#003135',
  primaryDark: '#024950',
  accent: '#0FA4AF',
  accentLight: 'rgba(15,164,175,0.12)',
  primaryForeground: '#ffffff',
  secondary: '#f8fafc',
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  destructive: '#e11d48',
  destructiveForeground: '#f8fafc',
  border: '#e2e8f0',
  borderFocus: 'rgba(15,164,175,0.35)',
  input: '#e2e8f0',
  ring: '#0FA4AF',
  cardBg: '#f8fafc',
  textSoft: '#334155',
  textBody: '#475569',
  // Dashboard-specific tokens
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  shadowColor: '#0f172a',
  headerBg: '#ffffff',
  headerBorder: '#f1f5f9',
  navPillBg: '#f8fafc',
  navPillBorder: '#e2e8f0',
  navPillText: '#64748b',
  statusBarStyle: 'dark-content',
  // Functional
  success: '#10B981',
  successLight: 'rgba(16,185,129,0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerLight: 'rgba(239,68,68,0.15)',
  destructive: '#e11d48',
  destructiveLight: 'rgba(225,29,72,0.15)',
  info: '#3B82F6',
  infoLight: 'rgba(59,130,246,0.15)',
  // Logout button
  logoutBg: '#FEF2F2',
  logoutBorder: '#FECACA',
  logoutIcon: '#EF4444',
  // Stat card
  statLabel: '#94A3B8',
  // Input
  inputBg: '#f8fafc',
  inputText: '#1E293B',
  inputPlaceholder: '#94A3B8',
  // Modal
  modalOverlay: 'rgba(0,0,0,0.5)',
};

const darkColors = {
  background: '#0f172a',
  foreground: '#f1f5f9',
  primary: '#0FA4AF',
  primaryDark: '#0FA4AF',
  accent: '#22d3ee',
  accentLight: 'rgba(34,211,238,0.15)',
  primaryForeground: '#ffffff',
  secondary: '#1e293b',
  secondaryForeground: '#f1f5f9',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  destructive: '#f87171',
  destructiveForeground: '#f8fafc',
  border: '#334155',
  borderFocus: 'rgba(34,211,238,0.35)',
  input: '#334155',
  ring: '#22d3ee',
  cardBg: '#1e293b',
  textSoft: '#cbd5e1',
  textBody: '#94a3b8',
  // Dashboard-specific tokens
  card: '#1e293b',
  cardBorder: '#334155',
  shadowColor: '#000000',
  headerBg: '#0f172a',
  headerBorder: '#1e293b',
  navPillBg: '#1e293b',
  navPillBorder: '#334155',
  navPillText: '#94a3b8',
  statusBarStyle: 'light-content',
  // Functional
  success: '#34D399',
  successLight: 'rgba(52,211,153,0.15)',
  warning: '#FBBF24',
  warningLight: 'rgba(251,191,36,0.15)',
  danger: '#f87171',
  dangerLight: 'rgba(248,113,113,0.15)',
  destructive: '#f87171',
  destructiveLight: 'rgba(248,113,113,0.15)',
  info: '#60A5FA',
  infoLight: 'rgba(96,165,250,0.15)',
  // Logout button
  logoutBg: 'rgba(239,68,68,0.15)',
  logoutBorder: 'rgba(239,68,68,0.3)',
  logoutIcon: '#f87171',
  // Stat card
  statLabel: '#94A3B8',
  // Input
  inputBg: '#334155',
  inputText: '#f1f5f9',
  inputPlaceholder: '#64748b',
  // Modal
  modalOverlay: 'rgba(0,0,0,0.7)',
};

// ---------------------------------------------------------------------------
// Static theme (non-color values)
// ---------------------------------------------------------------------------
const statics = {
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
};

// ---------------------------------------------------------------------------
// Build shadows dynamically based on current color palette
// ---------------------------------------------------------------------------
function buildShadows(colors) {
  return {
    sm: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  };
}

// ---------------------------------------------------------------------------
// Legacy export — keeps all existing `Theme.colors.xxx` references working
// ---------------------------------------------------------------------------
export const Theme = {
  colors: lightColors,
  darkColors,
  ...statics,
  shadows: buildShadows(lightColors),
};

// ---------------------------------------------------------------------------
// React Context for dark mode
// ---------------------------------------------------------------------------
const STORAGE_KEY = '@facidance_theme';

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  shadows: buildShadows(lightColors),
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => { if (saved) setMode(saved); })
      .catch(() => {});
  }, []);

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;
  const shadows = buildShadows(colors);

  const toggleTheme = async () => {
    const next = mode === 'system'
      ? 'dark'
      : mode === 'dark'
        ? 'light'
        : 'system';
    setMode(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, shadows, mode, toggleTheme, ...statics }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
