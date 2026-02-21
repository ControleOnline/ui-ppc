import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@store';

const APPEARANCE_KEY = 'ppc_appearance_mode_v1';
const DARK = 'dark';
const LIGHT = 'light';

export const readPpcAppearanceMode = () => {
  try {
    const raw = globalThis?.localStorage?.getItem(APPEARANCE_KEY);
    return raw === LIGHT ? LIGHT : DARK;
  } catch (e) {
    return DARK;
  }
};

export const writePpcAppearanceMode = (mode) => {
  const nextMode = mode === LIGHT ? LIGHT : DARK;
  try {
    globalThis?.localStorage?.setItem(APPEARANCE_KEY, nextMode);
  } catch (e) {
    // noop
  }
  return nextMode;
};

export const resolvePpcColors = (colors = {}, mode = DARK) => {
  const primary = colors.primary || '#1B5587';
  const isLight = mode === LIGHT;
  const darkDefaults = {
    appBg: '#060A11',
    panelBg: '#0B1220',
    cardBg: '#0D141D',
    cardBgSoft: '#101927',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    border: '#1E293B',
    borderSoft: '#334155',
    overlay: 'rgba(2,9,18,0.8)',
    dangerBg: '#1A0D10',
    pillTextDark: '#111827',
  };
  const lightDefaults = {
    appBg: '#EAF1F8',
    panelBg: '#FDFEFF',
    cardBg: '#FFFFFF',
    cardBgSoft: '#F4F8FC',
    textPrimary: '#0F172A',
    textSecondary: '#3F5168',
    border: '#C9D9E8',
    borderSoft: '#8BA4BC',
    overlay: 'rgba(15,23,42,0.35)',
    dangerBg: '#FEE2E2',
    pillTextDark: '#0F172A',
  };
  const defaults = isLight ? lightDefaults : darkDefaults;

  return {
    appBg: colors[isLight ? 'ppc-app-bg-light' : 'ppc-app-bg'] || defaults.appBg,
    panelBg: colors[isLight ? 'ppc-panel-bg-light' : 'ppc-panel-bg'] || defaults.panelBg,
    cardBg: colors[isLight ? 'ppc-card-bg-light' : 'ppc-card-bg'] || defaults.cardBg,
    cardBgSoft:
      colors[isLight ? 'ppc-card-bg-soft-light' : 'ppc-card-bg-soft'] || defaults.cardBgSoft,
    modalBg: colors['ppc-modal-bg'] || '#FBFCFF',
    textPrimary: colors[isLight ? 'ppc-text-primary-light' : 'ppc-text-primary'] || defaults.textPrimary,
    textSecondary:
      colors[isLight ? 'ppc-text-secondary-light' : 'ppc-text-secondary'] || defaults.textSecondary,
    textDark: colors['ppc-text-dark'] || '#0F172A',
    border: colors[isLight ? 'ppc-border-light' : 'ppc-border'] || defaults.border,
    borderSoft: colors[isLight ? 'ppc-border-soft-light' : 'ppc-border-soft'] || defaults.borderSoft,
    overlay: colors[isLight ? 'ppc-overlay-light' : 'ppc-overlay'] || defaults.overlay,
    accent: colors['ppc-accent'] || '#FACC15',
    accentInfo: colors['ppc-accent-info'] || '#38BDF8',
    danger: colors['ppc-danger'] || '#EF4444',
    dangerBg: colors[isLight ? 'ppc-danger-bg-light' : 'ppc-danger-bg'] || defaults.dangerBg,
    dangerText: colors['ppc-danger-text'] || '#FCA5A5',
    pillTextDark: colors[isLight ? 'ppc-pill-text-dark-light' : 'ppc-pill-text-dark'] || defaults.pillTextDark,
    primary,
    isLight,
    isDark: !isLight,
    mode: isLight ? LIGHT : DARK,
  };
};

export const usePpcTheme = () => {
  const themeStore = useStore('theme');
  const [mode, setMode] = useState(readPpcAppearanceMode);

  const setAppearanceMode = useCallback((nextMode) => {
    const saved = writePpcAppearanceMode(nextMode);
    setMode(saved);
  }, []);

  const toggleAppearanceMode = useCallback(() => {
    setAppearanceMode(mode === LIGHT ? DARK : LIGHT);
  }, [mode, setAppearanceMode]);

  useEffect(() => {
    const onStorage = () => setMode(readPpcAppearanceMode());
    globalThis?.addEventListener?.('storage', onStorage);
    return () => globalThis?.removeEventListener?.('storage', onStorage);
  }, []);

  const ppcColors = useMemo(
    () => resolvePpcColors(themeStore?.getters?.colors || {}, mode),
    [themeStore?.getters?.colors, mode]
  );

  return {
    ppcColors,
    mode,
    isLight: mode === LIGHT,
    isDark: mode !== LIGHT,
    setAppearanceMode,
    toggleAppearanceMode,
  };
};
