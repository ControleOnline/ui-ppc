import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 14,
        backgroundColor: ppcColors.appBg,
    },
    title: {
        color: ppcColors.textPrimary,
        fontWeight: '900',
    },
    titleRow: {
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    input: { marginVertical: 12, backgroundColor: ppcColors.cardBg },
    section: {
        marginTop: 16,
        color: ppcColors.textSecondary,
        fontWeight: '800',
    },
    errorText: { marginTop: 8, color: ppcColors.dangerText, fontWeight: '700' },
    searchList: {
        maxHeight: 220,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ppcColors.border,
        backgroundColor: ppcColors.cardBg,
    },
    searchListItem: {
        borderBottomWidth: 1,
        borderBottomColor: ppcColors.border,
    },
    queueList: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ppcColors.border,
        backgroundColor: ppcColors.cardBg,
    },
    queueListItem: {
        borderBottomWidth: 1,
        borderBottomColor: ppcColors.border,
    },
    listItemTitle: {
        color: ppcColors.textPrimary,
        fontWeight: '700',
    },
});

export default createStyles;
