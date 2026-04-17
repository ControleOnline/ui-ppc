import { StyleSheet } from 'react-native'
import { withOpacity } from '@controleonline/../../src/styles/branding'
const TV_LAYOUT_GAP = 8

const createStyles = ppcColors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ppcColors.appBg,
    },
    summaryCard: {
      marginHorizontal: 12,
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryIdentity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },
    summaryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    summaryTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    summaryTitle: {
      color: ppcColors.textPrimary,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '900',
    },
    summarySubtitle: {
      marginTop: 2,
      color: ppcColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    countBubble: {
      width: 48,
      height: 48,
      borderRadius: 999,
      backgroundColor: ppcColors.accentInfo,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.accentInfo, 0.55),
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      shadowColor: ppcColors.accentInfo,
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
      elevation: 4,
    },
    countBubbleText: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '900',
      lineHeight: 22,
    },
    countBubbleSkeleton: {
      width: 24,
      height: 12,
      borderRadius: 999,
      backgroundColor: withOpacity('#FFFFFF', 0.45),
    },
    summaryFooter: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: withOpacity(ppcColors.border, 0.7),
    },
    summaryTypePill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.panelBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    summaryTypeText: {
      fontSize: 10,
      letterSpacing: 0.8,
      fontWeight: '800',
    },
    sectionTitleRow: {
      marginTop: 2,
      marginBottom: 2,
      marginHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: ppcColors.border,
    },
    sectionTitle: {
      color: withOpacity(ppcColors.textSecondary, 0.85),
      fontSize: 11,
      letterSpacing: 1,
      fontWeight: '800',
    },
    list: {
      paddingHorizontal: 12,
      paddingBottom: 20,
      paddingTop: 8,
      gap: 10,
    },
    columnWrapper: {
      gap: 8,
      justifyContent: 'space-between',
    },
    orderCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      marginBottom: 8,
      maxWidth: '100%',
      overflow: 'hidden',
    },
    orderCardPressable: {
      flex: 1,
    },
    orderAccentBar: {
      height: 3,
    },
    orderCardInner: {
      padding: 10,
    },
    orderActions: {
      paddingHorizontal: 10,
      paddingBottom: 10,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: ppcColors.border,
      backgroundColor: ppcColors.cardBg,
    },
    printActionButton: {
      minHeight: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.accent, 0.42),
      backgroundColor: ppcColors.accent,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    printActionButtonText: {
      color: ppcColors.pillTextDark,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tvOrderCardInner: {
      padding: 8,
      flex: 1,
    },
    orderTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    tvOrderTopRow: {
      gap: 6,
    },
    orderIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    orderIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    tvOrderIconWrap: {
      width: 22,
      height: 22,
      marginRight: 8,
    },
    orderChannelLogo: {
      width: 16,
      height: 16,
      borderRadius: 999,
    },
    orderTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    orderTitle: {
      color: ppcColors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '900',
    },
    tvOrderTitle: {
      fontSize: 13,
      lineHeight: 16,
    },
    orderDate: {
      marginTop: 1,
      color: ppcColors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    tvOrderDate: {
      fontSize: 10,
    },
    orderStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tvOrderStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    orderStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginRight: 6,
    },
    orderStatusText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tvOrderStatusText: {
      fontSize: 9,
    },
    orderStatusWrap: {
      alignItems: 'flex-end',
      gap: 4,
    },
    orderMetaRow: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 10,
    },
    tvOrderMetaRow: {
      marginTop: 8,
      gap: 8,
    },
    waitingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.danger, 0.4),
      backgroundColor: withOpacity(ppcColors.danger, 0.1),
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 5,
    },
    tvWaitingChip: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      gap: 4,
    },
    waitingText: {
      color: ppcColors.dangerText,
      fontSize: 13,
      fontWeight: '800',
    },
    tvWaitingText: {
      fontSize: 11,
    },
    amountWrap: {
      alignItems: 'flex-end',
      minWidth: 100,
    },
    channelMetaText: {
      color: withOpacity(ppcColors.textSecondary, 0.85),
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    tvChannelMetaText: {
      fontSize: 10,
    },
    amountText: {
      marginTop: 1,
      color: ppcColors.accentInfo,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '900',
    },
    tvAmountText: {
      fontSize: 14,
      lineHeight: 17,
    },
    productsWrap: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ppcColors.border,
      overflow: 'hidden',
      backgroundColor: ppcColors.cardBgSoft,
    },
    tvProductsWrap: {
      marginTop: 8,
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 5, // antes 8
      gap: 8,
    },
    productRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: ppcColors.border,
    },
    qtyPill: {
      minWidth: 28,
      borderRadius: 7,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.panelBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tvQtyPill: {
      minWidth: 24,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    qtyPillText: {
      color: ppcColors.accentInfo,
      fontSize: 12,
      fontWeight: '800',
    },
    tvQtyPillText: {
      fontSize: 10,
    },
    productName: {
      flex: 1,
      color: ppcColors.textPrimary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    tvProductName: {
      fontSize: 11,
      lineHeight: 14,
    },
    skeletonWrap: {
      paddingHorizontal: 12,
      paddingTop: 8,
      gap: 10,
    },
    skeletonCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBg,
      padding: 12,
      gap: 10,
    },
    skeletonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    skeletonIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    skeletonCircle: {
      width: 32,
      height: 32,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      marginRight: 10,
    },
    skeletonTitleWrap: {
      flex: 1,
      gap: 8,
    },
    skeletonLineFill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      height: 11,
    },
    skeletonTitle: {
      width: '56%',
      height: 14,
    },
    skeletonDate: {
      width: '40%',
    },
    skeletonStatus: {
      width: 76,
      height: 25,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
    },
    skeletonMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 10,
    },
    skeletonWait: {
      width: 88,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
    },
    skeletonPriceBlock: {
      width: 110,
      alignItems: 'flex-end',
      gap: 6,
    },
    skeletonChannel: {
      width: '80%',
    },
    skeletonAmount: {
      width: '100%',
      height: 16,
    },
    productBlock: {
      paddingVertical: 6,
    },

    productDescription: {
      marginTop: 2,
      color: withOpacity(ppcColors.textSecondary, 0.7),
      fontSize: 10,
      fontWeight: '500',
    },
    tvProductDescription: {
      fontSize: 9,
      marginTop: 1,
    },

    groupWrap: {
      marginTop: 6,
      paddingLeft: 10,
    },

    groupTitlePill: {
      alignSelf: 'flex-start',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.border, 0.9),
      backgroundColor: withOpacity(ppcColors.accentInfo, 0.08),
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginBottom: 4,
    },
    tvGroupTitlePill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginBottom: 3,
    },

    groupTitle: {
      fontSize: 9,
      fontWeight: '900',
      color: ppcColors.accentInfo,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tvGroupTitle: {
      fontSize: 8,
    },

    groupItem: {
      paddingVertical: 2,
      paddingLeft: 4,
    },

    groupItemText: {
      fontSize: 12,
      color: ppcColors.textPrimary,
      fontWeight: '600',
    },
    tvGroupItemText: {
      fontSize: 10,
    },
    tvSummaryCard: {
      marginHorizontal: 10,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    tvSummaryHeader: {
      minHeight: 0,
    },
    tvSummaryIconWrap: {
      width: 32,
      height: 32,
      marginRight: 8,
    },
    tvSummaryTitle: {
      fontSize: 15,
      lineHeight: 18,
    },
    tvSummarySubtitle: {
      fontSize: 11,
    },
    tvCountBubble: {
      width: 42,
      height: 42,
    },
    tvCountBubbleText: {
      fontSize: 17,
      lineHeight: 20,
    },
    tvSummaryFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    tvSummaryPagePill: {
      alignSelf: 'flex-end',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.panelBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    tvSummaryPageText: {
      color: ppcColors.textSecondary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    tvSectionTitleRow: {
      marginTop: 0,
      marginBottom: 0,
      marginHorizontal: 10,
      gap: 6,
    },
    tvSectionTitle: {
      fontSize: 10,
    },
    tvPageViewport: {
      paddingHorizontal: 10,
      paddingTop: 6,
      paddingBottom: 6,
      overflow: 'hidden',
    },
    tvPageGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      gap: TV_LAYOUT_GAP,
    },
    tvOrderCard: {
      flex: 0,
      flexBasis: 'auto',
      marginBottom: 0,
    },
    tvSegmentBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.textSecondary, 0.25),
      backgroundColor: ppcColors.panelBg,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    tvSegmentBadgeText: {
      color: ppcColors.textSecondary,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
  })

export default createStyles

export const inlineStyle_916_28 = {
  flex: 1,
};

