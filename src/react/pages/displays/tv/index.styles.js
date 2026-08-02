import { StyleSheet } from 'react-native'
import { withOpacity } from '@controleonline/../../src/styles/branding'

const createStyles = ppcColors =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: ppcColors.appBg,
    },
    list: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 12,
    },
    columnWrapper: {
      gap: 12,
      justifyContent: 'space-between',
    },
    orderCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      overflow: 'hidden',
    },
    orderAccentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    orderCardContent: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
    },
    orderNumberText: {
      fontSize: 18,
      lineHeight: 22,
    },
    incorporatedProductText: {
      fontWeight: '500',
    },
    productsWrap: {
      marginTop: 10,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 10,
    },
    loadingText: {
      color: ppcColors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    loadingInlineWrap: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loadingInlineText: {
      color: ppcColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    tvMapStage: {
      flex: 1,
      position: 'relative',
      minHeight: 0,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    emptyText: {
      color: ppcColors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    emptyCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 10,
    },
    emptyHint: {
      color: withOpacity(ppcColors.textSecondary, 0.8),
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  })

export default createStyles
