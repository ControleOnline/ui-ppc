import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import { resolveDisplayedOrderStatus } from '@controleonline/ui-orders/src/react/components/OrderHeader'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { withOpacity } from '@controleonline/../../src/styles/branding'
import { useDisplayPrint } from '../useDisplayPrint'
import DisplayPrinterSelectionModal from '../DisplayPrinterSelectionModal'
import RealtimeDebugBar from '@controleonline/ui-ppc/src/react/components/RealtimeDebugBar'
const normalizeText = value => String(value || '').trim()
const formatDebugClock = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const pad = entry => String(entry).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const TV_LAYOUT_GAP = 8
const TV_MIN_CARD_WIDTH = 300
const TV_MIN_CARD_HEIGHT = 240
const TV_BASE_PAGE_ROTATION_MS = 9000
const TV_MAX_PAGE_ROTATION_MS = 22000

const getOrderRealStatus = order => {
  const candidates = [
    order?.status?.realStatus,
    order?.status?.real_status,
    order?.realStatus,
    order?.real_status,
    order?.order?.status?.realStatus,
    order?.order?.status?.real_status,
    order?.order?.realStatus,
    order?.order?.real_status,
  ]

  return normalizeText(
    candidates.find(value => normalizeText(value)),
  ).toLowerCase()
}

const isDisplayVisibleOrder = order => getOrderRealStatus(order) === 'open'

const parseEntityId = value => {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) return Number(trimmed)
    const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/)
    if (iriMatch?.[1]) return Number(iriMatch[1])
    return null
  }
  if (typeof value?.id === 'number') return value.id
  if (typeof value?.id === 'string') return parseEntityId(value.id)
  if (value?.['@id']) return parseEntityId(String(value['@id']))
  return null
}

const isMessageForCompany = (message, companyId) => {
  if (!message) return false

  const expectedCompanyId = parseEntityId(companyId)
  const messageCompanyId = parseEntityId(message.company)

  if (!expectedCompanyId || !messageCompanyId) {
    return true
  }

  return expectedCompanyId === messageCompanyId
}

const removeConsumedMessages = (messages, companyId) =>
  (Array.isArray(messages) ? messages : []).filter(
    message => !isMessageForCompany(message, companyId),
  )

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

const updateMeasuredLayoutSize = (setter, value) => {
  const nextValue = Math.max(0, Math.round(Number(value || 0)))
  setter(previous => (previous === nextValue ? previous : nextValue))
}

const estimateTextUnits = (value, charsPerLine = 28) => {
  const normalized = normalizeText(value)
  if (!normalized) return 0

  const safeCharsPerLine = Math.max(12, Math.round(Number(charsPerLine || 0)))
  return Math.max(1, Math.ceil(normalized.length / safeCharsPerLine))
}

const getStatusVisual = (order, ppcColors) => {
  const statusPresentation = resolveDisplayedOrderStatus(order, ppcColors.textSecondary)

  return {
    label: statusPresentation.labelUpper,
    textColor: statusPresentation.color,
    borderColor: withOpacity(statusPresentation.color, 0.42),
    bgColor: withOpacity(statusPresentation.color, 0.12),
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

  const products = Array.from(map.values())

  return Number.isFinite(maxItems)
    ? products.slice(0, Math.max(0, maxItems))
    : products
}

const estimateTvProductUnits = (product, charsPerLine = 28) => {
  const groupEntries = Object.entries(product?.groups || {})
  let units = 1

  units += estimateTextUnits(product?.name, charsPerLine)
  units += estimateTextUnits(product?.description, charsPerLine + 8)

  groupEntries.forEach(([groupName, items]) => {
    units += estimateTextUnits(groupName, charsPerLine + 10)

    ;(Array.isArray(items) ? items : []).forEach(child => {
      units += estimateTextUnits(
        `${Number(child?.quantity || 1)}x ${normalizeText(child?.name)}`,
        charsPerLine,
      )
    })
  })

  return Math.max(3, units)
}

const buildTvOrderSegments = (orders, maxUnitsPerCard, charsPerLine = 28) =>
  (Array.isArray(orders) ? orders : []).flatMap(order => {
    const products = getOrderProductsPreview(order, Number.POSITIVE_INFINITY)

    if (products.length === 0) {
      return [{
        key: `tv-order-${order?.id || Math.random()}-0`,
        order,
        products: [],
        segmentIndex: 0,
        segmentCount: 1,
        totalUnits: 0,
      }]
    }

    const segments = []
    let currentProducts = []
    let currentUnits = 0

    products.forEach(product => {
      const productUnits = estimateTvProductUnits(product, charsPerLine)
      const wouldOverflow =
        currentProducts.length > 0 &&
        currentUnits + productUnits > maxUnitsPerCard

      if (wouldOverflow) {
        segments.push({
          order,
          products: currentProducts,
          totalUnits: currentUnits,
        })
        currentProducts = []
        currentUnits = 0
      }

      currentProducts.push(product)
      currentUnits += productUnits
    })

    if (currentProducts.length > 0) {
      segments.push({
        order,
        products: currentProducts,
        totalUnits: currentUnits,
      })
    }

    return segments.map((segment, index) => ({
      key: `tv-order-${order?.id || index}-${index}`,
      order,
      products: segment.products,
      totalUnits: segment.totalUnits,
      segmentIndex: index,
      segmentCount: segments.length,
    }))
  })

const chunkItems = (items, size) => {
  const safeItems = Array.isArray(items) ? items : []
  const safeSize = Math.max(1, Number(size) || 1)
  const chunks = []

  for (let index = 0; index < safeItems.length; index += safeSize) {
    chunks.push(safeItems.slice(index, index + safeSize))
  }

  return chunks
}

const getTvBaseColumns = width => {
  if (width >= 3400) return 5
  if (width >= 2560) return 4
  if (width >= 1700) return 3
  if (width >= 1100) return 2
  return 1
}

const getTvBaseRows = height => {
  if (height >= 1700) return 4
  if (height >= 1200) return 3
  if (height >= 780) return 2
  return 1
}

const resolveTvLayoutMetrics = ({
  width,
  height,
  summaryHeight,
  sectionHeight,
  footerHeight = 0,
}) => {
  const contentWidth = Math.max(220, Math.round(width - 24))
  const availableHeight = Math.max(
    140,
    Math.round(height - summaryHeight - sectionHeight - footerHeight - 20),
  )

  let columns = getTvBaseColumns(width)
  while (
    columns > 1 &&
    Math.floor((contentWidth - (TV_LAYOUT_GAP * (columns - 1))) / columns) < TV_MIN_CARD_WIDTH
  ) {
    columns -= 1
  }

  let rows = getTvBaseRows(height)
  while (
    rows > 1 &&
    Math.floor((availableHeight - (TV_LAYOUT_GAP * (rows - 1))) / rows) < TV_MIN_CARD_HEIGHT
  ) {
    rows -= 1
  }

  const cardWidth = Math.floor(
    (contentWidth - (TV_LAYOUT_GAP * (columns - 1))) / Math.max(1, columns),
  )
  const cardHeight = Math.floor(
    (availableHeight - (TV_LAYOUT_GAP * (rows - 1))) / Math.max(1, rows),
  )
  const fixedChromeHeight = cardHeight >= 520 ? 184 : cardHeight >= 380 ? 158 : 138
  const charsPerLine = clamp(
    Math.floor((cardWidth - 92) / 7),
    16,
    42,
  )
  const maxUnitsPerCard = clamp(
    Math.floor((cardHeight - fixedChromeHeight) / 16),
    3,
    36,
  )

  return {
    columns,
    rows,
    cardWidth,
    cardHeight,
    contentWidth,
    availableHeight,
    cardsPerPage: Math.max(1, columns * rows),
    charsPerLine,
    maxUnitsPerCard,
  }
}

// Display exibe apenas pedidos ativos (realStatus === 'open')


const Orders = ({ display = {}, isTvDisplay = false }) => {
  const route = useRoute()
  const navigation = useNavigation()
  const { width, height } = useWindowDimensions()
  const displayId = decodeURIComponent(route.params?.id || '')

  const peopleStore = useStore('people')
  const queuesStore = useStore('queues')
  const ordersStore = useStore('orders')
  const websocketStore = useStore('websocket')
  const runtimeDebugStore = useStore('runtime_debug')
  const { getters, actions } = queuesStore
  const runtimeDebugActions = runtimeDebugStore.actions
  const { isLoading, messages: queueMessages } = getters
  const ordersActions = ordersStore.actions
  const ordersMessages = ordersStore?.getters?.messages
  const websocketStatus = websocketStore?.getters?.summary || {}
  const websocketConnected = Boolean(websocketStatus?.connected)
  const { currentCompany } = peopleStore.getters
  const { ppcColors } = useDisplayTheme()
  const {
    printOrderToAttachedPrinter,
    printerOptions,
    selectedPrinterDeviceId,
    isPrinterSelectionVisible,
    isSavingPrinterSelection,
    handleSelectPrinter,
    closePrinterSelection,
  } = useDisplayPrint({ display })

  const [orders, setOrders] = useState([])
  const [visibleCount, setVisibleCount] = useState(50)
  const [summaryHeight, setSummaryHeight] = useState(0)
  const [sectionTitleHeight, setSectionTitleHeight] = useState(0)
  const [debugBarHeight, setDebugBarHeight] = useState(0)
  const [tvCurrentPage, setTvCurrentPage] = useState(0)
  const [refreshDebug, setRefreshDebug] = useState({
    lastAt: null,
    lastSource: 'boot',
    lastDetail: 'startup',
  })
  const tvMode =
    Boolean(isTvDisplay) || String(display?.displayType || '').toLowerCase() === 'tv'

  const effectiveWidth = useMemo(() => {
    const screenWidth = Number(Dimensions.get('screen')?.width || 0)
    const windowWidth = Number(width || 0)
    return Math.max(windowWidth, screenWidth)
  }, [width])

  const effectiveHeight = useMemo(() => {
    const screenHeight = Number(Dimensions.get('screen')?.height || 0)
    const windowHeight = Number(height || 0)
    return Math.max(windowHeight, screenHeight)
  }, [height])

  const tvLayout = useMemo(() => {
    if (!tvMode) return null

    return resolveTvLayoutMetrics({
      width: effectiveWidth,
      height: effectiveHeight,
      summaryHeight,
      sectionHeight: sectionTitleHeight,
      footerHeight: tvMode ? debugBarHeight : 0,
    })
  }, [debugBarHeight, effectiveHeight, effectiveWidth, sectionTitleHeight, summaryHeight, tvMode])

  const columns = useMemo(() => {
    if (tvMode) {
      return tvLayout?.columns || 1
    }

    if (effectiveWidth >= 1920) return 6
    if (effectiveWidth >= 1600) return 5
    if (effectiveWidth >= 1200) return 4
    if (effectiveWidth >= 800) return 3
    if (effectiveWidth >= 600) return 2
    return 1
  }, [effectiveWidth, tvLayout?.columns, tvMode])

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const showSkeleton = isLoading && (!Array.isArray(orders) || orders.length === 0)

  const noteRefresh = useCallback((source, detail = '') => {
    const updatedAt = new Date().toISOString()
    setRefreshDebug({
      lastAt: updatedAt,
      lastSource: source || 'manual',
      lastDetail: detail || '',
    })
    runtimeDebugActions.setFooterEntry({
      key: 'screen-refresh',
      order: 20,
      updatedAt,
      lines: [
        `ultimo refresh: ${formatDebugClock(updatedAt)} | origem: ${source || 'manual'}${detail ? ` (${detail})` : ''}`,
      ],
    })
  }, [runtimeDebugActions])

  useEffect(() => {
    return () => {
      runtimeDebugActions.clearFooterEntry('screen-refresh')
    }
  }, [runtimeDebugActions])

  const fetchOrders = useCallback((source = 'manual', detail = '') => {
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
        noteRefresh(source, detail)
      })
  }, [actions, currentCompany?.id, displayId, noteRefresh])

  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []

    return [...orders]
      .filter(isDisplayVisibleOrder)
      .sort((a, b) => {
        const aTime = new Date(resolveOrderDateValue(a)).getTime()
        const bTime = new Date(resolveOrderDateValue(b)).getTime()
        const safeATime = Number.isFinite(aTime) ? aTime : 0
        const safeBTime = Number.isFinite(bTime) ? bTime : 0
        return safeATime - safeBTime
      })
  }, [orders])

  const listCount = sortedOrders.length

  const tvOrderSegments = useMemo(() => {
    if (!tvMode || !tvLayout) return []

    return buildTvOrderSegments(
      sortedOrders,
      tvLayout.maxUnitsPerCard,
      tvLayout.charsPerLine,
    )
  }, [sortedOrders, tvLayout, tvMode])

  const tvPages = useMemo(() => {
    if (!tvMode || !tvLayout) return []

    return chunkItems(tvOrderSegments, tvLayout.cardsPerPage).map(items => ({
      items,
      totalUnits: items.reduce(
        (total, segment) => total + Number(segment?.totalUnits || 0),
        0,
      ),
    }))
  }, [tvLayout, tvMode, tvOrderSegments])

  const currentTvPage = useMemo(() => {
    if (!tvPages.length) return null
    return tvPages[Math.min(tvCurrentPage, tvPages.length - 1)] || null
  }, [tvCurrentPage, tvPages])

  const tvPageRotationMs = useMemo(() => {
    if (!currentTvPage) return TV_BASE_PAGE_ROTATION_MS

    return clamp(
      TV_BASE_PAGE_ROTATION_MS + (Number(currentTvPage.totalUnits || 0) * 420),
      TV_BASE_PAGE_ROTATION_MS,
      TV_MAX_PAGE_ROTATION_MS,
    )
  }, [currentTvPage])

  const handlePrintOrder = useCallback(
    item => {
      const orderId = parseEntityId(item?.id)
      if (!orderId) {
        return
      }

      printOrderToAttachedPrinter({ orderId })
    },
    [printOrderToAttachedPrinter],
  )

  const hasQueueRefreshMessage = useMemo(
    () =>
      (Array.isArray(queueMessages) ? queueMessages : []).some(message =>
        isMessageForCompany(message, currentCompany?.id),
      ),
    [currentCompany?.id, queueMessages],
  )

  const hasOrderRefreshMessage = useMemo(
    () =>
      (Array.isArray(ordersMessages) ? ordersMessages : []).some(message =>
        isMessageForCompany(message, currentCompany?.id),
      ),
    [currentCompany?.id, ordersMessages],
  )

  useEffect(() => {
    if (!hasQueueRefreshMessage && !hasOrderRefreshMessage) {
      return
    }

    actions.setMessages(removeConsumedMessages(queueMessages, currentCompany?.id))
    ordersActions.setMessages(removeConsumedMessages(ordersMessages, currentCompany?.id))
    const refreshSources = [
      hasQueueRefreshMessage ? 'queues' : '',
      hasOrderRefreshMessage ? 'orders' : '',
    ].filter(Boolean)

    const refreshTimeout = setTimeout(() => {
      fetchOrders('socket', refreshSources.join('+'))
    }, 220)

    return () => clearTimeout(refreshTimeout)
  }, [
    actions,
    currentCompany?.id,
    fetchOrders,
    hasOrderRefreshMessage,
    hasQueueRefreshMessage,
    ordersActions,
    ordersMessages,
    queueMessages,
  ])

  useFocusEffect(
    useCallback(() => {
      fetchOrders('focus', 'screen-focus')
      const refreshIntervalMs = websocketConnected ? 30000 : 20000

      const interval = setInterval(() => {
        fetchOrders(
          'interval',
          websocketConnected ? 'connected-poll' : 'fallback-poll',
        )
      }, refreshIntervalMs)

      return () => clearInterval(interval)
    }, [fetchOrders, websocketConnected]),
  )

  useEffect(() => {
    if (!tvMode) return

    setTvCurrentPage(previousPage =>
      previousPage >= tvPages.length ? 0 : previousPage,
    )
  }, [tvMode, tvPages.length])

  useEffect(() => {
    if (!tvMode || tvPages.length <= 1) {
      return
    }

    const timer = setTimeout(() => {
      setTvCurrentPage(previousPage => (previousPage + 1) % tvPages.length)
    }, tvPageRotationMs)

    return () => clearTimeout(timer)
  }, [tvMode, tvPageRotationMs, tvPages.length, tvCurrentPage])

  const renderOrderCard = useCallback(
    (itemOrRenderInfo, cardStyle = null) => {
      const normalizedItem =
        itemOrRenderInfo?.item &&
        !itemOrRenderInfo?.order &&
        !itemOrRenderInfo?.products
          ? itemOrRenderInfo.item
          : itemOrRenderInfo

      const order = normalizedItem?.order || normalizedItem
      const segmentIndex = Number(normalizedItem?.segmentIndex || 0)
      const segmentCount = Number(normalizedItem?.segmentCount || 1)
      const isSplitSegment = segmentCount > 1
      const orderDateValue = resolveOrderDateValue(order)
      const statusVisual = getStatusVisual(order, ppcColors)
      const waitingMinutes = getWaitingMinutes(orderDateValue)
      const channelLogo = getOrderChannelLogo(order)
      const channelLabel = String(getOrderChannelLabel(order) || 'SHOP').toUpperCase()
      const externalRef = truncateMiddle(getExternalOrderRef(order))
      const channelDisplay = externalRef ? `${channelLabel} (${externalRef})` : channelLabel
      const products = normalizedItem?.products || getOrderProductsPreview(order, tvMode ? 3 : 5)
      const price = Number(order?.price || 0)

      return (
        <View
          key={normalizedItem?.key || `order-card-${parseEntityId(order?.id) || segmentIndex}`}
          style={[
            styles.orderCard,
            tvMode && styles.tvOrderCard,
            cardStyle,
          ]}
        >
          <Pressable
            style={styles.orderCardPressable}
            onPress={() =>
              navigation.navigate('OrderDetails', {
                order,
                kds: true,
                displayType: display?.displayType,
                display: {
                  id: parseEntityId(display?.id) || parseEntityId(displayId),
                  displayType: display?.displayType || route.params?.displayType,
                },
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
                  <Text style={[styles.orderTitle, tvMode && styles.tvOrderTitle]}>Pedido #{order?.id}</Text>
                  <Text style={[styles.orderDate, tvMode && styles.tvOrderDate]}>{formatOrderDate(orderDateValue)}</Text>
                </View>
              </View>

              <View style={styles.orderStatusWrap}>
                {isSplitSegment && tvMode ? (
                  <View style={styles.tvSegmentBadge}>
                    <Text style={styles.tvSegmentBadgeText}>
                      {segmentIndex + 1}/{segmentCount}
                    </Text>
                  </View>
                ) : null}
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
                <Text
                  style={[styles.channelMetaText, tvMode && styles.tvChannelMetaText]}
                  numberOfLines={tvMode ? 2 : 1}
                >
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
                    <View style={styles.productRow}>
                      <View style={[styles.qtyPill, tvMode && styles.tvQtyPill]}>
                        <Text style={[styles.qtyPillText, tvMode && styles.tvQtyPillText]}>{product.quantity}x</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.productName, tvMode && styles.tvProductName]}
                          numberOfLines={tvMode ? 2 : 1}
                        >
                          {product.name}
                        </Text>

                        {!!product.description && (
                          <Text
                            style={[styles.productDescription, tvMode && styles.tvProductDescription]}
                            numberOfLines={tvMode ? 2 : 1}
                          >
                            {product.description}
                          </Text>
                        )}
                      </View>
                    </View>

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

          {!tvMode && (
            <View style={styles.orderActions}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.printActionButton}
                onPress={() => handlePrintOrder(order)}
              >
                <MaterialCommunityIcons
                  name="printer-outline"
                  size={16}
                  color={ppcColors.pillTextDark}
                />
                <Text style={styles.printActionButtonText}>Imprimir pedido</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )
    },
    [display?.displayType, display?.id, displayId, handlePrintOrder, navigation, ppcColors, route.params?.displayType, styles, tvMode],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View
        style={[styles.summaryCard, tvMode && styles.tvSummaryCard]}
        onLayout={
          tvMode
            ? event =>
                updateMeasuredLayoutSize(
                  setSummaryHeight,
                  event?.nativeEvent?.layout?.height,
                )
            : undefined
        }
      >
        <View style={[styles.summaryHeader, tvMode && styles.tvSummaryHeader]}>
          <View style={styles.summaryIdentity}>
            <View style={[styles.summaryIconWrap, tvMode && styles.tvSummaryIconWrap]}>
              <MaterialCommunityIcons
                name={display?.displayType === 'products' ? 'silverware-fork-knife' : 'receipt-text'}
                size={18}
                color={display?.displayType === 'products' ? ppcColors.accent : ppcColors.accentInfo}
              />
            </View>
            <View style={styles.summaryTitleWrap}>
              <Text numberOfLines={1} style={[styles.summaryTitle, tvMode && styles.tvSummaryTitle]}>
                {String(display?.display || 'Display')}
              </Text>
              <Text style={[styles.summarySubtitle, tvMode && styles.tvSummarySubtitle]}>Pedidos na fila</Text>
            </View>
          </View>

          <View style={[styles.countBubble, tvMode && styles.tvCountBubble]}>
            {isLoading ? (
              <View style={styles.countBubbleSkeleton} />
            ) : (
              <Text style={[styles.countBubbleText, tvMode && styles.tvCountBubbleText]}>{listCount}</Text>
            )}
          </View>

        </View>

        <View style={[styles.summaryFooter, tvMode && styles.tvSummaryFooter]}>
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

          {tvMode && tvPages.length > 1 ? (
            <View style={styles.tvSummaryPagePill}>
              <Text style={styles.tvSummaryPageText}>
                PAG {Math.min(tvCurrentPage + 1, tvPages.length)}/{tvPages.length}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[styles.sectionTitleRow, tvMode && styles.tvSectionTitleRow]}
        onLayout={
          tvMode
            ? event =>
                updateMeasuredLayoutSize(
                  setSectionTitleHeight,
                  event?.nativeEvent?.layout?.height,
                )
            : undefined
        }
      >
        <View style={styles.sectionLine} />
        <Text style={[styles.sectionTitle, tvMode && styles.tvSectionTitle]}>LISTA DE PEDIDOS</Text>
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
      ) : tvMode ? (
        <View
          style={[
            styles.tvPageViewport,
            tvLayout ? { height: tvLayout.availableHeight } : null,
          ]}
        >
          <View style={styles.tvPageGrid}>
            {(currentTvPage?.items || []).map(segment =>
              renderOrderCard(segment, {
                width: tvLayout?.cardWidth,
                height: tvLayout?.cardHeight,
                marginBottom: 0,
                flexGrow: 0,
                flexShrink: 0,
              }),
            )}
          </View>
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

      {!tvMode && (
        <DisplayPrinterSelectionModal
          visible={isPrinterSelectionVisible}
          printers={printerOptions}
          selectedPrinterDeviceId={selectedPrinterDeviceId}
          saving={isSavingPrinterSelection}
          onSelectPrinter={handleSelectPrinter}
          onClose={closePrinterSelection}
          ppcColorsOverride={ppcColors}
        />
      )}

      <View
        onLayout={
          tvMode
            ? event =>
                updateMeasuredLayoutSize(
                  setDebugBarHeight,
                  event?.nativeEvent?.layout?.height,
                )
            : undefined
        }
      >
        <RealtimeDebugBar
          companyId={currentCompany?.id}
          ppcColors={ppcColors}
          refreshState={refreshDebug}
          websocketStatus={websocketStatus}
        />
      </View>
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
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: TV_LAYOUT_GAP,
    },
    tvOrderCard: {
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

export default Orders
