import { StyleSheet } from 'react-native';

const createStyles = (ppcColors, compact) =>
  StyleSheet.create({
    wrap: {
      width: compact ? 146 : 164,
      height: compact ? 34 : 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.panelBg,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 3,
      position: 'relative',
      overflow: 'hidden',
    },
    thumb: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      width: compact ? 68 : 78,
      borderRadius: 999,
      backgroundColor: ppcColors.accent,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    thumbDark: {
      left: 3,
    },
    thumbLight: {
      right: 3,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 999,
      zIndex: 2,
    },
    optionActive: {
      opacity: 1,
    },
    optionInactive: {
      opacity: 0.82,
    },
    label: {
      fontSize: compact ? 10 : 11,
      fontWeight: '800',
      color: ppcColors.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: ppcColors.textDark,
    },
  });

export default createStyles;
