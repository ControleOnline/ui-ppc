import { StyleSheet } from 'react-native';

const createStyles = ppcColors =>
    StyleSheet.create({
        wrap: {
            paddingHorizontal: 16,
            paddingBottom: 6,
            paddingTop: 2,
        },
        loadingWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 6,
        },
        loadingText: {
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        itemRow: {
            marginTop: 8,
            paddingTop: 12,
            paddingBottom: 10,
            borderTopWidth: 1,
            borderTopColor: ppcColors.border,
        },
        itemMainRow: {},
        itemLead: {},
        itemThumbWrap: {
            backgroundColor: ppcColors.panelBg,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
        },
        itemThumbImage: {},
        itemThumbPlaceholder: {
            backgroundColor: ppcColors.panelBg,
        },
        itemThumbPlaceholderText: {
            color: ppcColors.textSecondary,
        },
        itemContent: {},
        metaWrap: {},
        queueBadge: {},
        queueBadgeDot: {},
        queueBadgeText: {
            color: ppcColors.textSecondary,
        },
        itemActions: {},
        priceRow: {
            marginTop: 2,
        },
        text: {
            color: ppcColors.textPrimary,
            fontSize: 15,
            fontWeight: '900',
            lineHeight: 20,
        },
        subText: {
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 17,
        },
        qtyText: {
            color: ppcColors.textPrimary,
            fontWeight: '900',
        },
        statusMarker: {
            fontWeight: '900',
        },
        groupWrap: {
            marginTop: 8,
            marginLeft: 12,
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: ppcColors.borderSoft,
            gap: 6,
        },
        groupTitlePill: {
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: ppcColors.panelBg,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
        },
        groupTitle: {
            color: ppcColors.textSecondary,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        groupItem: {},
        groupItemMainRow: {},
        groupItemContent: {},
        groupItemMetaWrap: {},
        groupItemActions: {},
        groupItemText: {
            color: ppcColors.textPrimary,
            fontSize: 13,
            fontWeight: '800',
            lineHeight: 18,
        },
        groupItemMetaText: {
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
        },
        groupItemPriceText: {
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
        },
    });

export default createStyles;
