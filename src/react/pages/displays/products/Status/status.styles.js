import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) =>
    StyleSheet.create({
        pageSection: {
            flex: 1,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: ppcColors.appBg,
        },
        stageCard: {
            flex: 1,
            overflow: 'hidden',
            backgroundColor: ppcColors.cardBg,
            borderColor: ppcColors.border,
            borderWidth: 1,
            borderRadius: 16,
        },
        stageAccent: {
            height: 2,
            backgroundColor: ppcColors.accent,
        },
        stageHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
        },
        stageTitle: {
            color: ppcColors.textPrimary,
            fontWeight: '900',
            fontSize: 22,
            lineHeight: 26,
            letterSpacing: 0.2,
        },
        totalPill: {
            minWidth: 50,
            borderRadius: 999,
            paddingHorizontal: 11,
            paddingVertical: 4,
            backgroundColor: ppcColors.isLight ? ppcColors.panelBg : ppcColors.accent,
            borderWidth: 1,
            borderColor: ppcColors.accent,
            alignItems: 'center',
            marginTop: 1,
        },
        totalPillText: {
            color: ppcColors.isLight ? ppcColors.accent : ppcColors.pillTextDark,
            fontSize: 17,
            fontWeight: '900',
        },
        listContent: {
            paddingHorizontal: 12,
            paddingBottom: 8,
        },
        loadingWrap: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 24,
        },
        loadingText: {
            marginTop: 8,
            color: ppcColors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        emptyWrap: {
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: ppcColors.borderSoft,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 12,
            marginBottom: 8,
            backgroundColor: ppcColors.cardBgSoft,
        },
        emptyText: {
            color: ppcColors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        orderCard: {
            width: '100%',
            marginBottom: 10,
            backgroundColor: ppcColors.cardBgSoft,
            borderColor: ppcColors.border,
            borderWidth: 1,
            borderRadius: 12,
            alignSelf: 'stretch',
        },
        orderContent: {
            paddingBottom: 4,
        },
        ticketTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
        },
        internalOrderCode: {
            flex: 1,
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        marketplaceHighlight: {
            marginTop: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ppcColors.accent,
            backgroundColor: ppcColors.isLight
                ? 'rgba(250, 204, 21, 0.12)'
                : 'rgba(250, 204, 21, 0.14)',
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        marketplaceLabel: {
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        marketplaceCode: {
            marginTop: 3,
            color: ppcColors.textPrimary,
            fontSize: 24,
            fontWeight: '900',
            lineHeight: 28,
        },
        clientName: {
            marginTop: 8,
            color: ppcColors.textPrimary,
            fontSize: 16,
            fontWeight: '800',
        },
        orderMeta: {
            marginTop: 4,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        orderQty: {
            marginTop: 7,
            color: ppcColors.textPrimary,
            fontSize: 16,
            fontWeight: '900',
        },
        detailLine: {
            marginTop: 4,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
            lineHeight: 17,
        },
        actions: {
            justifyContent: 'flex-end',
            paddingHorizontal: 14,
            paddingBottom: 10,
            paddingTop: 4,
            flexWrap: 'wrap',
        },
        actionButton: {
            borderRadius: 999,
            minWidth: 132,
        },
        secondaryActionButton: {
            marginRight: 8,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.panelBg,
            minWidth: 120,
        },
        actionLabel: {
            fontWeight: '900',
            fontSize: 14,
        },
        loadingMoreWrap: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
        },
        loadingMoreText: {
            marginTop: 6,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        footerSpacer: {
            height: 6,
        },
    });

export default createStyles;
