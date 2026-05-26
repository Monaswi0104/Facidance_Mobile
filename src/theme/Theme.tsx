import React, { createContext, useContext, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------
export const lightColors = {
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
  statusBarStyle: 'dark-content' as 'light-content' | 'dark-content',
  // Functional
  success: '#10B981',
  successLight: 'rgba(16,185,129,0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerLight: 'rgba(239,68,68,0.15)',
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

export type ThemeColors = typeof lightColors;

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
function buildShadows(colors: ThemeColors) {
  return {
    sm: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  };
}

type ThemeShadows = ReturnType<typeof buildShadows>;

// ---------------------------------------------------------------------------
// Legacy export — keeps all existing `Theme.colors.xxx` references working
// ---------------------------------------------------------------------------
export const Theme = {
  colors: lightColors,
  ...statics,
  shadows: buildShadows(lightColors),
};

// ---------------------------------------------------------------------------
// React Context for theme
// ---------------------------------------------------------------------------
interface ThemeContextType {
  colors: ThemeColors;
  shadows: ThemeShadows;
  radius: typeof statics.radius;
  fonts: typeof statics.fonts;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  shadows: buildShadows(lightColors),
  ...statics,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const colors: ThemeColors = lightColors;
  const shadows: ThemeShadows = buildShadows(colors);

  return (
    <ThemeContext.Provider value={{ colors, shadows, ...statics }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
