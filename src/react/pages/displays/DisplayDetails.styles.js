import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) =>
    StyleSheet.create({
        loadingWrap: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
            paddingHorizontal: 12,
            paddingTop: 10,
        },
        loadingCard: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBg,
            padding: 14,
            gap: 10,
        },
        skeletonLine: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            height: 12,
        },
        skeletonTitle: {
            width: '54%',
            height: 15,
        },
        skeletonRow: {
            width: '100%',
        },
        skeletonButton: {
            width: '42%',
            height: 28,
        },
        fallbackTitle: {
            color: ppcColors.textPrimary,
            fontSize: 18,
            lineHeight: 22,
            fontWeight: '900',
        },
        fallbackText: {
            color: ppcColors.textSecondary,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: '600',
        },
    });

export default createStyles;
