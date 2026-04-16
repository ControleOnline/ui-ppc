import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 6,
            backgroundColor: ppcColors.appBg,
        },
        card: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.cardBg,
            paddingHorizontal: 10,
            paddingVertical: 10,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
        },
        title: {
            color: ppcColors.textPrimary,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.7,
        },
        currentDateWrap: {
            alignItems: 'flex-end',
            justifyContent: 'center',
            flexShrink: 1,
        },
        currentDateLabel: {
            color: ppcColors.textSecondary,
            fontSize: 10,
            lineHeight: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        currentDateValue: {
            color: ppcColors.textPrimary,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '900',
            textAlign: 'right',
        },
        chipsRow: {
            paddingRight: 2,
            gap: 8,
        },
        chip: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        chipActive: {
            borderColor: ppcColors.accent,
            backgroundColor: ppcColors.isLight ? ppcColors.panelBg : ppcColors.accent,
        },
        chipText: {
            color: ppcColors.textSecondary,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '800',
        },
        chipTextActive: {
            color: ppcColors.isLight ? ppcColors.accent : ppcColors.pillTextDark,
        },
    });

export default createStyles;
