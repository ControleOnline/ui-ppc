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
        customRangeWrap: {
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: ppcColors.borderSoft,
            gap: 10,
        },
        customInputsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        customInput: {
            flex: 1,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            color: ppcColors.textPrimary,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            lineHeight: 16,
            fontWeight: '700',
        },
        validationText: {
            color: ppcColors.danger || '#DC2626',
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '700',
        },
        customActionsRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
        },
        secondaryButton: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.panelBg,
            paddingHorizontal: 14,
            paddingVertical: 9,
        },
        secondaryButtonText: {
            color: ppcColors.textPrimary,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '800',
        },
        primaryButton: {
            borderRadius: 999,
            backgroundColor: ppcColors.accent,
            paddingHorizontal: 14,
            paddingVertical: 9,
        },
        primaryButtonText: {
            color: ppcColors.pillTextDark,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '900',
        },
    });

export default createStyles;
