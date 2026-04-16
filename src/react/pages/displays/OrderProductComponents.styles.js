import { StyleSheet } from 'react-native';

const createStyles = ppcColors =>
    StyleSheet.create({
        wrap: {
            paddingHorizontal: 16,
            paddingBottom: 4,
        },
        groupWrap: {
            marginBottom: 8,
        },
        groupLabel: {
            marginBottom: 4,
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        itemWrap: {
            marginBottom: 4,
        },
        itemLine: {
            color: ppcColors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            lineHeight: 18,
        },
        commentLine: {
            marginTop: 2,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 17,
        },
    });

export default createStyles;
