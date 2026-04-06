import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
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

const resolveOrderDateValue = order =>
  normalizeText(order?.alterDate || order?.alter_date || order?.orderDate)

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

const getOrderProductsPreview = (order, maxItems = 5) => {
  const items = Array.isArray(order?.orderProducts) ? order.orderProducts : []

  const map = new Map()

  items.forEach(item => {
    const product = item?.product || {}
    const parentId =
      item?.productGroup?.parentProduct?.id || product?.id

    if (!map.has(parentId)) {
      map.set(parentId, {
        id: parentId,
        name: normalizeText(product?.product),
        description: normalizeText(product?.description),
        quantity: 0,
        groups: {},
      })
    }

    const parent = map.get(parentId)

    // soma quantidade do principal
    if (!item?.productGroup) {
      parent.quantity += Number(item?.quantity || 1)
    }

    // se tiver grupo → organizar
    if (item?.productGroup) {
      const groupName = normalizeText(item?.productGroup?.productGroup || 'Outros')

      if (!parent.groups[groupName]) {
        parent.groups[groupName] = []
      }

      parent.groups[groupName].push({
        id: item?.id,
        name: normalizeText(product?.product),
        quantity: Number(item?.quantity || 1),
      })
    }
  })

  return Array.from(map.values()).slice(0, maxItems)
}

const EXCLUDED_REAL_STATUSES = new Set([
  'cancelled', 'canceled', 'closed', 'concluded',
  'cancelado', 'concluido', 'finalizado',
])

const Orders = ({ display = {}, isTvDisplay = false }) => {
  const route = useRoute()
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  const displayId = decodeURIComponent(route.params?.id || '')

  const peopleStore = useStore('people')
  const queuesStore = useStore('queues')
  const ordersStore = useStore('orders')
  const { getters, actions } = queuesStore
  const { totalItems, isLoading, messages: queueMessages } = getters
  const ordersMessages = ordersStore?.getters?.messages
  const { currentCompany } = peopleStore.getters
  const { ppcColors } = useDisplayTheme()

  const [orders, setOrders] = useState([])
  const [visibleCount, setVisibleCount] = useState(50)
  const tvMode =
    Boolean(isTvDisplay) || String(display?.displayType || '').toLowerCase() === 'tv'

  const effectiveWidth = useMemo(() => {
    const screenWidth = Number(Dimensions.get('screen')?.width || 0)
    const windowWidth = Number(width || 0)
    return Math.max(windowWidth, screenWidth)
  }, [width])

  const columns = useMemo(() => {
    if (tvMode) {
      if (effectiveWidth >= 2500) return 6
      if (effectiveWidth >= 1920) return 5
      if (effectiveWidth >= 1400) return 4
      if (effectiveWidth >= 1100) return 3
      if (effectiveWidth >= 760) return 3
      if (effectiveWidth >= 560) return 2
      return 1
    }

    if (effectiveWidth >= 1920) return 6
    if (effectiveWidth >= 1600) return 5
    if (effectiveWidth >= 1200) return 4
    if (effectiveWidth >= 800) return 3
    if (effectiveWidth >= 600) return 2
    return 1
  }, [effectiveWidth, tvMode])

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const showSkeleton = isLoading && (!Array.isArray(orders) || orders.length === 0)
  const listCount = Number(totalItems || orders?.length || 0)

  const fetchOrders = useCallback(() => {
    if (!displayId || !currentCompany?.id) return

    setVisibleCount(50)
    actions
      .ordersQueue({
        status: { realStatus: ['open'] },
        provider: currentCompany.id,
        itemsPerPage: 50,
      })
      .then(data => {
        setOrders(Array.isArray(data) ? data : [])
      })
  }, [actions, currentCompany?.id, displayId])

  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []

    return [...orders]
      .filter(order => {
        const realStatus = normalizeText(order?.status?.realStatus).toLowerCase()
        return !EXCLUDED_REAL_STATUSES.has(realStatus)
      })
      .sort((a, b) => {
        const aTime = new Date(resolveOrderDateValue(a)).getTime()
        const bTime = new Date(resolveOrderDateValue(b)).getTime()
        const safeATime = Number.isFinite(aTime) ? aTime : 0
        const safeBTime = Number.isFinite(bTime) ? bTime : 0
        return safeATime - safeBTime
      })
  }, [orders])

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
      const orderDateValue = resolveOrderDateValue(item)
      const statusVisual = getStatusVisual(item, ppcColors)
      const waitingMinutes = getWaitingMinutes(orderDateValue)
      const channelLogo = getOrderChannelLogo(item)
      const channelLabel = String(getOrderChannelLabel(item) || 'SHOP').toUpperCase()
      const externalRef = truncateMiddle(getExternalOrderRef(item))
      const channelDisplay = externalRef ? `${channelLabel} (${externalRef})` : channelLabel
      const products = getOrderProductsPreview(item, tvMode ? 3 : 5)
      const price = Number(item?.price || 0)

      return (
        <Pressable
          style={styles.orderCard}
          onPress={() =>
            navigation.navigate('OrderDetails', {
              order: item,
              kds: true,
              displayType: display?.displayType,
              hideBottomToolBar: tvMode,
            })
          }
        >
          <View style={[styles.orderAccentBar, { backgroundColor: statusVisual.textColor }]} />
          <View style={[styles.orderCardInner, tvMode && styles.tvOrderCardInner]}>
          <View style={[styles.orderTopRow, tvMode && styles.tvOrderTopRow]}>
            <View style={styles.orderIdentity}>
              <View style={[styles.orderIconWrap, tvMode && styles.tvOrderIconWrap]}>
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
                <Text style={[styles.orderTitle, tvMode && styles.tvOrderTitle]}>Pedido #{item?.id}</Text>
                <Text style={[styles.orderDate, tvMode && styles.tvOrderDate]}>{formatOrderDate(orderDateValue)}</Text>
              </View>
            </View>

            <View
              style={[
                styles.orderStatusBadge,
                tvMode && styles.tvOrderStatusBadge,
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
                  tvMode && styles.tvOrderStatusText,
                  { color: statusVisual.textColor },
                ]}
              >
                {statusVisual.label}
              </Text>
            </View>
          </View>

          <View style={[styles.orderMetaRow, tvMode && styles.tvOrderMetaRow]}>
            <View style={[styles.waitingChip, tvMode && styles.tvWaitingChip]}>
              <MaterialCommunityIcons
                name="clock-time-four-outline"
                size={tvMode ? 10 : 12}
                color={ppcColors.danger}
              />
              <Text style={[styles.waitingText, tvMode && styles.tvWaitingText]}>{waitingMinutes} min</Text>
            </View>

            <View style={styles.amountWrap}>
              <Text style={[styles.channelMetaText, tvMode && styles.tvChannelMetaText]} numberOfLines={1}>
                {channelDisplay}
              </Text>
              <Text style={[styles.amountText, tvMode && styles.tvAmountText]}>{Formatter.formatMoney(price)}</Text>
            </View>
          </View>

          {products.length > 0 && (
            <View style={[styles.productsWrap, tvMode && styles.tvProductsWrap]}>
              {products.map((product, index) => (
                <View
                  key={String(product.id)}
                  style={[
                    styles.productBlock,
                    index < products.length - 1 && styles.productRowDivider,
                  ]}
                >
                  {/* Produto principal */}
                  <View style={styles.productRow}>
                    <View style={[styles.qtyPill, tvMode && styles.tvQtyPill]}>
                      <Text style={[styles.qtyPillText, tvMode && styles.tvQtyPillText]}>{product.quantity}x</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, tvMode && styles.tvProductName]} numberOfLines={1}>
                        {product.name}
                      </Text>

                      {!!product.description && (
                        <Text style={[styles.productDescription, tvMode && styles.tvProductDescription]} numberOfLines={1}>
                          {product.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Grupos */}
                  {Object.entries(product.groups || {}).map(([groupName, items]) => (
                    <View key={groupName} style={styles.groupWrap}>
                      <View style={[styles.groupTitlePill, tvMode && styles.tvGroupTitlePill]}>
                        <Text style={[styles.groupTitle, tvMode && styles.tvGroupTitle]}>{groupName}</Text>
                      </View>

                      {items.map(child => (
                        <View key={child.id} style={[styles.groupItem, { marginLeft: 12 }]}>
                          <Text style={[styles.groupItemText, tvMode && styles.tvGroupItemText]}>
                            {child.quantity}x {child.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
          </View>
        </Pressable>
      )
    },
    [display?.displayType, navigation, ppcColors, styles, tvMode],
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
          data={sortedOrders.slice(0, visibleCount)}
          key={`orders-cols-${columns}`}
          numColumns={columns}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderCard}
          columnWrapperStyle={columns > 1 ? styles.columnWrapper : null}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (visibleCount < sortedOrders.length) setVisibleCount(v => v + 50)
          }}
          onEndReachedThreshold={0.3}
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
    orderAccentBar: {
      height: 3,
    },
    orderCardInner: {
      padding: 10,
    },
    tvOrderCardInner: {
      padding: 8,
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
  })

export default Orders
