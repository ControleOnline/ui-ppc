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
    input: {
        minHeight: 48,
        marginVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: 8,
        fontSize: 16,
    },
    section: {
        marginTop: 16,
        color: ppcColors.textSecondary,
        fontWeight: '800',
    },
    errorText: { marginTop: 8, color: ppcColors.dangerText, fontWeight: '700' },
    searchList: {
        maxHeight: 260,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: ppcColors.border,
        backgroundColor: ppcColors.cardBg,
    },
    searchListItem: {
        borderBottomWidth: 1,
        borderBottomColor: ppcColors.border,
    },
    queueList: {
        flex: 1,
        marginTop: 8,
        borderRadius: 8,
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
    emptyListContent: {
        minHeight: 72,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    emptyText: {
        color: ppcColors.textSecondary,
        textAlign: 'center',
    },
});

export default createStyles;
