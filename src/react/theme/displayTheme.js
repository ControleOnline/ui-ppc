import { useMemo } from 'react';
import { useStore } from '@store';
import { colors as fallbackColors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

export const buildDisplayTheme = (palette = {}, themeColors = {}) => {
  const accent = themeColors['ppc-accent'] || palette.primary;
  const secondaryAccent =
    themeColors['ppc-accent-info'] || palette.secondary;

  return {
    appBg: palette.background,
    panelBg: themeColors['ppc-panel-bg-light'] || '#FFFFFF',
    cardBg: themeColors['ppc-card-bg-light'] || '#FFFFFF',
    cardBgSoft:
      themeColors['ppc-card-bg-soft-light'] || withOpacity(accent, 0.07),
    modalBg: themeColors['ppc-modal-bg'] || themeColors['ppc-card-bg-light'] || '#FFFFFF',
    textPrimary:
      themeColors['ppc-text-primary-light'] || palette.text,
    textSecondary:
      themeColors['ppc-text-secondary-light'] ||
      palette.textSecondary ||
      '#475569',
    textDark: themeColors['ppc-text-dark'] || palette.text,
    border:
      themeColors['ppc-border-light'] ||
      withOpacity(palette.primary || accent, 0.16),
    borderSoft:
      themeColors['ppc-border-soft-light'] ||
      withOpacity(palette.primary || accent, 0.3),
    overlay: themeColors['ppc-overlay-light'] || 'rgba(15,23,42,0.32)',
    accent,
    accentInfo: secondaryAccent,
    danger: themeColors['ppc-danger'],
    dangerBg: themeColors['ppc-danger-bg-light'],
    dangerText: themeColors['ppc-danger-text'],
    pillTextDark: themeColors['ppc-pill-text-dark-light'],
    primary: palette.primary || accent,
    mode: 'light',
    isLight: true,
    isDark: false,
  };
};

export const useDisplayTheme = () => {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const globalThemeColors = themeStore?.getters?.colors || {};
  const companyThemeColors = currentCompany?.theme?.colors || {};

  const mergedThemeColors = useMemo(
    () => ({
      ...globalThemeColors,
      ...companyThemeColors,
    }),
    [companyThemeColors, globalThemeColors],
  );

  const brandColors = useMemo(
    () => resolveThemePalette(mergedThemeColors, fallbackColors),
    [mergedThemeColors],
  );

  const ppcColors = useMemo(
    () => buildDisplayTheme(brandColors, mergedThemeColors),
    [brandColors, mergedThemeColors],
  );

  return {
    ppcColors,
    brandColors,
    currentCompany,
    themeColors: mergedThemeColors,
  };
};
