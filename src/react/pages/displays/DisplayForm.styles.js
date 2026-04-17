import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) =>
  StyleSheet.create({
    container: {
      minHeight: '100%',
      padding: 16,
      backgroundColor: ppcColors.appBg,
      justifyContent: 'center',
    },
    formCard: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBg,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: ppcColors.border,
      paddingBottom: 10,
      marginBottom: 14,
    },
    title: {
      color: ppcColors.textPrimary,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 4,
      color: ppcColors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    label: {
      fontWeight: '800',
      marginBottom: 8,
      color: ppcColors.textPrimary,
      fontSize: 14,
    },
    input: {
      backgroundColor: ppcColors.cardBgSoft,
      color: ppcColors.textPrimary,
      borderWidth: 1,
      borderColor: ppcColors.border,
      padding: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    typesWrapper: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    typeButton: {
      minWidth: 120,
      paddingVertical: 9,
      paddingHorizontal: 16,
      backgroundColor: ppcColors.cardBgSoft,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      alignItems: 'center',
    },
    typeButtonSelected: {
      backgroundColor: ppcColors.accent,
      borderColor: ppcColors.accent,
    },
    typeText: {
      color: ppcColors.textPrimary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontSize: 12,
    },
    typeTextSelected: {
      color: ppcColors.pillTextDark,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontSize: 12,
    },
    saveButton: {
      backgroundColor: ppcColors.accent,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: ppcColors.pillTextDark,
      fontWeight: '900',
      fontSize: 15,
    },
    errorText: {
      marginTop: 10,
      color: ppcColors.dangerText,
      fontSize: 13,
      fontWeight: '700',
    },
    hintBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: ppcColors.border,
      borderRadius: 12,
      backgroundColor: ppcColors.cardBgSoft,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    hintText: {
      color: ppcColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
  });

export default createStyles;
