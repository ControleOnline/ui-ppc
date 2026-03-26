import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import YouTube from '@controleonline/ui-common/src/react/components/YouTube';
import {
  getOrderChannelLabel,
  getOrderChannelLogo,
} from '@assets/ppc/channels'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { withOpacity } from '@controleonline/../../src/styles/branding'

const normalizeText = value => String(value || '').trim()

const extractExtraEntries = extraData => {
  if (!Array.isArray(extraData)) return []
  return extraData
    .filter(
      item =>
        item?.value &&
        item?.extra_fields?.name === 'code',
    )
    .map(item => ({
      context: item?.extra_fields?.context,
      value: item?.value,
    }))
}

const isChannelContext = context =>
  /ifood|food99|99|instagram|insta|keeta|whats|messenger|facebook/i.test(
    String(context || ''),
  )

const getExternalOrderRef = order => {
  const entries = extractExtraEntries(order?.extraData)
  const preferred = entries.find(item => isChannelContext(item?.context))
  const fallback = entries[0]
  return normalizeText(preferred?.value || fallback?.value)
}

const truncateMiddle = (value, maxLength = 28, head = 12, tail = 8) => {
  const normalized = normalizeText(value)
  if (!normalized || normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`
}

const getWaitingMinutes = orderDate => {
  if (!orderDate) return 0
  const diff = Date.now() - new Date(orderDate).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

const pad2 = value => String(value).padStart(2, '0')

const formatOrderDate = dateValue => {
  if (!dateValue) return '-'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '-'

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}, ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`
}

const getStatusVisual = (order, ppcColors) => {
  const statusLabelRaw = normalizeText(order?.status?.status || order?.status?.realStatus || 'open')
  const statusLabel = statusLabelRaw ? statusLabelRaw.toUpperCase() : 'OPEN'
  const lower = statusLabelRaw.toLowerCase()
  const isPaid = lower.includes('paid') || lower.includes('pago')
  const isCanceled = lower.includes('cancel')

  const fallbackColor = isPaid
    ? '#22C55E'
    : isCanceled
      ? '#EF4444'
      : ppcColors.textSecondary

  const baseColor = normalizeText(order?.status?.color) || fallbackColor

  return {
    label: statusLabel,
    textColor: baseColor,
    borderColor: withOpacity(baseColor, 0.42),
    bgColor: withOpacity(baseColor, 0.12),
  }
}

const getOrderProductsPreview = order => {
  const allProducts = Array.isArray(order?.orderProducts) ? order.orderProducts : []
  const positiveProducts = allProducts.filter(item => Number(item?.quantity || 0) > 0)

  const nonComponents = positiveProducts.filter(
    item => String(item?.product?.type || '').toLowerCase() !== 'component',
  )

  const source = nonComponents.length > 0 ? nonComponents : positiveProducts

  return source.slice(0, 5).map((item, index) => ({
    id: item?.id || `${order?.id || 'order'}-${index}`,
    quantity: Number(item?.quantity || 1),
    name: normalizeText(item?.product?.product || item?.product?.description || 'Item'),
  }))
}

const Orders = ({ display = {} }) => {
  const route = useRoute()
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  const displayId = decodeURIComponent(route.params?.id || '')

  const peopleStore = useStore('people')
  const queuesStore = useStore('queues')
  const ordersStore = useStore('orders')
  const { getters, actions } = queuesStore
  const { items, totalItems, isLoading, messages: queueMessages } = getters
  const ordersMessages = ordersStore?.getters?.messages
  const { currentCompany } = peopleStore.getters
  const { ppcColors } = useDisplayTheme()

  const [orders, setOrders] = useState([])

  const columns = useMemo(() => {
    if (width >= 1150) return 2
    return 1
  }, [width])

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const showSkeleton = isLoading && (!Array.isArray(orders) || orders.length === 0)
  const listCount = Number(totalItems || orders?.length || 0)

  const fetchOrders = useCallback(() => {
    if (!displayId || !currentCompany?.id) return

    actions
      .ordersQueue({
        status: { realStatus: ['open'] },
        provider: currentCompany.id,
      })
      .then(data => {
        setOrders(Array.isArray(data) ? data : [])
      })
  }, [actions, currentCompany?.id, displayId])

  useFocusEffect(
    useCallback(() => {
      if (Array.isArray(items)) {
        setOrders(items)
      }
    }, [items]),
  )

  const queueMessageCount = Array.isArray(queueMessages) ? queueMessages.length : 0
  const ordersMessageCount = Array.isArray(ordersMessages) ? ordersMessages.length : 0

  useEffect(() => {
    if (queueMessageCount === 0 && ordersMessageCount === 0) {
      return
    }

    const refreshTimeout = setTimeout(() => {
      fetchOrders()
    }, 220)

    return () => clearTimeout(refreshTimeout)
  }, [queueMessageCount, ordersMessageCount, fetchOrders])

  useFocusEffect(
    useCallback(() => {
      fetchOrders()
      const interval = setInterval(() => {
        fetchOrders()
      }, 60000)

      return () => clearInterval(interval)
    }, [fetchOrders]),
  )

  const renderOrderCard = useCallback(
    ({ item }) => {
      const statusVisual = getStatusVisual(item, ppcColors)
      const waitingMinutes = getWaitingMinutes(item?.orderDate)
      const channelLogo = getOrderChannelLogo(item)
      const channelLabel = String(getOrderChannelLabel(item) || 'SHOP').toUpperCase()
      const externalRef = truncateMiddle(getExternalOrderRef(item))
      const channelDisplay = externalRef ? `${channelLabel} (${externalRef})` : channelLabel
      const products = getOrderProductsPreview(item)
      const price = Number(item?.price || 0)

      return (
        <Pressable
          style={styles.orderCard}
          onPress={() => navigation.navigate('OrderDetails', { order: item, kds: true })}
        >
          <View style={styles.orderTopRow}>
            <View style={styles.orderIdentity}>
              <View style={styles.orderIconWrap}>
                {channelLogo ? (
                  <Image source={channelLogo} style={styles.orderChannelLogo} resizeMode="contain" />
                ) : (
                  <MaterialCommunityIcons
                    name="receipt-text"
                    size={16}
                    color={ppcColors.accentInfo}
                  />
                )}
              </View>

              <View style={styles.orderTitleWrap}>
                <Text style={styles.orderTitle}>Pedido #{item?.id}</Text>
                <Text style={styles.orderDate}>{formatOrderDate(item?.orderDate)}</Text>
              </View>
            </View>

            <View
              style={[
                styles.orderStatusBadge,
                {
                  borderColor: statusVisual.borderColor,
                  backgroundColor: statusVisual.bgColor,
                },
              ]}
            >
              <View
                style={[
                  styles.orderStatusDot,
                  { backgroundColor: statusVisual.textColor },
                ]}
              />
              <Text
                style={[
                  styles.orderStatusText,
                  { color: statusVisual.textColor },
                ]}
              >
                {statusVisual.label}
              </Text>
            </View>
          </View>

          <View style={styles.orderMetaRow}>
            <View style={styles.waitingChip}>
              <MaterialCommunityIcons
                name="clock-time-four-outline"
                size={12}
                color={ppcColors.danger}
              />
              <Text style={styles.waitingText}>{waitingMinutes} min</Text>
            </View>

            <View style={styles.amountWrap}>
              <Text style={styles.channelMetaText} numberOfLines={1}>
                {channelDisplay}
              </Text>
              <Text style={styles.amountText}>{Formatter.formatMoney(price)}</Text>
            </View>
          </View>

          {products.length > 0 && (
            <View style={styles.productsWrap}>
              {products.map((product, index) => (
                <View
                  key={String(product.id)}
                  style={[
                    styles.productRow,
                    index < products.length - 1 && styles.productRowDivider,
                  ]}
                >
                  <View style={styles.qtyPill}>
                    <Text style={styles.qtyPillText}>{product.quantity}x</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      )
    },
    [navigation, ppcColors, styles],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIdentity}>
            <View style={styles.summaryIconWrap}>
              <MaterialCommunityIcons
                name={display?.displayType === 'products' ? 'silverware-fork-knife' : 'receipt-text'}
                size={18}
                color={display?.displayType === 'products' ? ppcColors.accent : ppcColors.accentInfo}
              />
            </View>
            <View style={styles.summaryTitleWrap}>
              <Text numberOfLines={1} style={styles.summaryTitle}>
                {String(display?.display || 'Display')}
              </Text>
              <Text style={styles.summarySubtitle}>Pedidos na fila</Text>
            </View>
          </View>

          <View style={styles.countBubble}>
            {isLoading ? (
              <View style={styles.countBubbleSkeleton} />
            ) : (
              <Text style={styles.countBubbleText}>{listCount}</Text>
            )}
          </View>
          {display?.displayType === 'tv' && <YouTube />}
        </View>

        <View style={styles.summaryFooter}>
          <View style={styles.summaryTypePill}>
            <Text
              style={[
                styles.summaryTypeText,
                { color: display?.displayType === 'products' ? ppcColors.accent : ppcColors.accentInfo },
              ]}
            >
              {String(display?.displayType || 'orders').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionTitle}>LISTA DE PEDIDOS</Text>
        <View style={styles.sectionLine} />
      </View>

      {showSkeleton ? (
        <View style={styles.skeletonWrap}>
          {[1, 2, 3].map(key => (
            <View key={`orders-skeleton-${key}`} style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonIdentity}>
                  <View style={styles.skeletonCircle} />
                  <View style={styles.skeletonTitleWrap}>
                    <View style={[styles.skeletonLineFill, styles.skeletonTitle]} />
                    <View style={[styles.skeletonLineFill, styles.skeletonDate]} />
                  </View>
                </View>
                <View style={styles.skeletonStatus} />
              </View>
              <View style={styles.skeletonMetaRow}>
                <View style={styles.skeletonWait} />
                <View style={styles.skeletonPriceBlock}>
                  <View style={[styles.skeletonLineFill, styles.skeletonChannel]} />
                  <View style={[styles.skeletonLineFill, styles.skeletonAmount]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          key={`orders-cols-${columns}`}
          numColumns={columns}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderCard}
          columnWrapperStyle={columns > 1 ? styles.columnWrapper : null}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  )
}

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
      gap: 10,
    },
    orderCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      padding: 12,
      marginBottom: 10,
    },
    orderTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    orderIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    orderIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    orderChannelLogo: {
      width: 20,
      height: 20,
      borderRadius: 999,
    },
    orderTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    orderTitle: {
      color: ppcColors.textPrimary,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '900',
    },
    orderDate: {
      marginTop: 1,
      color: ppcColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    orderStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    orderStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginRight: 6,
    },
    orderStatusText: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    orderMetaRow: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 10,
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
    waitingText: {
      color: ppcColors.dangerText,
      fontSize: 13,
      fontWeight: '800',
    },
    amountWrap: {
      alignItems: 'flex-end',
      minWidth: 100,
    },
    channelMetaText: {
      color: withOpacity(ppcColors.textSecondary, 0.85),
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    amountText: {
      marginTop: 1,
      color: ppcColors.accentInfo,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '900',
    },
    productsWrap: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ppcColors.border,
      overflow: 'hidden',
      backgroundColor: ppcColors.cardBgSoft,
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 8,
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
    qtyPillText: {
      color: ppcColors.accentInfo,
      fontSize: 12,
      fontWeight: '800',
    },
    productName: {
      flex: 1,
      color: ppcColors.textPrimary,
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '700',
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
  })

export default Orders
