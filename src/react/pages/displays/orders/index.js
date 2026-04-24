import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, FlatList, Image, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { parseConfigsObject } from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'

import {
  getOrderChannelLabel,
  getOrderChannelLogo,
} from '@assets/ppc/channels'

import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
import { resolveDisplayedOrderStatus } from '@controleonline/ui-orders/src/react/components/OrderHeader'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { withOpacity } from '@controleonline/../../src/styles/branding'
import { DISPLAY_DEVICE_TYPE } from '@controleonline/ui-common/src/react/utils/printerDevices'

import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices'

import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton'
import RealtimeDebugBar from '@controleonline/ui-ppc/src/react/components/RealtimeDebugBar'
import { buildOrderDetailsRouteParams } from '@controleonline/ui-orders/src/react/utils/orderRoute'
import createStyles from './index.styles'

import {
  DISPLAY_DEVICE_LINK_CONFIG_KEY,
  DISPLAY_MIN_COLUMNS_CONFIG_KEY,
} from '@controleonline/ui-ppc/src/react/utils/forcedDisplay'

const { isDisplayVisibleOrder } = require('./orderVisibility')
const normalizeText = value => String(value || '').trim()

const normalizeQuantity = value => {
  const numericValue = Number(value || 0)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

const formatQuantityPrefix = value => {
  const quantity = normalizeQuantity(value)
  return quantity >= 2 ? `${quantity}x ` : ''
}

const getOrderProductCategoryLabel = item =>
  normalizeText(
    item?.product?.category?.name ||
    item?.product?.category?.category ||
    item?.category?.name ||
    item?.category?.category ||
    item?.product?.productCategory?.category?.name ||
    item?.product?.productCategory?.category?.category ||
    item?.product?.productCategories?.[0]?.category?.name ||
    item?.product?.productCategories?.[0]?.category?.category ||
    item?.productCategory?.category?.name ||
    item?.productCategory?.category?.category ||
    item?.product?.categoryName ||
    '',
  )

const getOrderProductGroupLabel = item =>
  normalizeText(
    item?.productGroup?.productGroup ||
    item?.productGroup?.name ||
    item?.productGroupName ||
    item?.groupName ||
    '',
  )

const getOrderProductBucketLabel = item =>
  getOrderProductCategoryLabel(item) || getOrderProductGroupLabel(item) || 'Outros'

const formatDebugClock = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const pad = entry => String(entry).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePositiveInteger = value => {
  const normalized = String(value || '').replace(/\D+/g, '').trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const TV_LAYOUT_GAP = 8
const TV_MIN_CARD_WIDTH = 300
const TV_MIN_CARD_HEIGHT = 240
const TV_BASE_PAGE_ROTATION_MS = 9000
const TV_MAX_PAGE_ROTATION_MS = 22000

const resolveDisplayDeviceConfig = ({
  deviceConfigs = [],
  companyId,
  currentDeviceId,
  displayId,
}) => {
  const normalizedDisplayId = normalizeEntityId(displayId)
  if (!normalizedDisplayId) {
    return null
  }

  const matchingConfigs = filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => {
      const deviceType = String(deviceConfig?.type || deviceConfig?.device?.type || '')
        .trim()
        .toUpperCase()

      if (deviceType !== DISPLAY_DEVICE_TYPE) {
        return false
      }

      const configs = parseConfigsObject(deviceConfig?.configs)
      return normalizeEntityId(configs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]) === normalizedDisplayId
    })

  if (matchingConfigs.length === 0) {
    return null
  }

  return (
    matchingConfigs.find(
      deviceConfig =>
        normalizeDeviceId(deviceConfig?.device?.device) ===
        normalizeDeviceId(currentDeviceId),
    ) || matchingConfigs[0]
  )
}

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

const resolveOrderDateValue = order =>
  normalizeText(order?.alterDate || order?.alter_date || order?.orderDate)

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
      const groupName = getOrderProductBucketLabel(item)

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
        `${formatQuantityPrefix(child?.quantity)}${normalizeText(child?.name)}`.trim(),
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

// Display exibe pedidos em produção e prontos para finalização.


const Orders = ({ display = {}, isTvDisplay = false }) => {
  const route = useRoute()
  const navigation = useNavigation()
  const { width, height } = useWindowDimensions()
  const displayId = decodeURIComponent(route.params?.id || '')

  const peopleStore = useStore('people')
  const queuesStore = useStore('queues')
  const ordersStore = useStore('orders')
  const deviceConfigStore = useStore('device_config')
  const deviceStore = useStore('device')
  const websocketStore = useStore('websocket')
  const runtimeDebugStore = useStore('runtime_debug')
  const { getters, actions } = queuesStore
  const runtimeDebugActions = runtimeDebugStore.actions
  const { isLoading, messages: queueMessages } = getters
  const ordersActions = ordersStore.actions
  const ordersMessages = ordersStore?.getters?.messages
  const companyDeviceConfigs = deviceConfigStore?.getters?.items || []
  const currentDevice = deviceStore?.getters?.item || {}
  const websocketStatus = websocketStore?.getters?.summary || {}
  const websocketConnected = Boolean(websocketStatus?.connected)
  const { currentCompany } = peopleStore.getters
  const { ppcColors } = useDisplayTheme()

  const [orders, setOrders] = useState([])
  const [visibleCount, setVisibleCount] = useState(50)
  const [summaryHeight] = useState(0)
  const [sectionTitleHeight] = useState(0)
  const [debugBarHeight] = useState(0)
  const [tvCurrentPage, setTvCurrentPage] = useState(0)
  const [refreshDebug, setRefreshDebug] = useState({
    lastAt: null,
    lastSource: 'boot',
    lastDetail: 'startup',
  })
  const tvMode =
    Boolean(isTvDisplay) || String(display?.displayType || '').toLowerCase() === 'tv'
  const useTvPagedLayout = false

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

  const selectedDisplayId = useMemo(
    () => normalizeEntityId(display?.id || display?.['@id'] || displayId),
    [display, displayId],
  )

  const linkedDisplayDeviceConfig = useMemo(
    () =>
      resolveDisplayDeviceConfig({
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
        currentDeviceId: currentDevice?.id || currentDevice?.device,
        displayId: selectedDisplayId,
      }),
    [
      companyDeviceConfigs,
      currentCompany?.id,
      currentDevice?.device,
      currentDevice?.id,
      selectedDisplayId,
    ],
  )

  const tvLayout = useMemo(() => {
    if (!useTvPagedLayout) return null

    return resolveTvLayoutMetrics({
      width: effectiveWidth,
      height: effectiveHeight,
      summaryHeight,
      sectionHeight: sectionTitleHeight,
      footerHeight: tvMode ? debugBarHeight : 0,
    })
  }, [debugBarHeight, effectiveHeight, effectiveWidth, sectionTitleHeight, summaryHeight, tvMode, useTvPagedLayout])

  const configuredMinColumns = useMemo(() => {
    const configs = parseConfigsObject(linkedDisplayDeviceConfig?.configs)
    return parsePositiveInteger(configs?.[DISPLAY_MIN_COLUMNS_CONFIG_KEY])
  }, [linkedDisplayDeviceConfig?.configs])

  const columns = useMemo(() => {
    const responsiveColumns = useTvPagedLayout
      ? (tvLayout?.columns || 1)
      : effectiveWidth > 1920
        ? 6
        : effectiveWidth >= 1600
          ? 5
          : effectiveWidth >= 1200
            ? 4
            : effectiveWidth >= 800
              ? 3
              : effectiveWidth >= 600
                ? 2
                : 1

    return Math.max(responsiveColumns, configuredMinColumns || 1)
  }, [configuredMinColumns, effectiveWidth, tvLayout?.columns, useTvPagedLayout])

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const orderProductsStyles = useMemo(() => ({
    itemRow: styles.orderProductItemRow,
    itemMainRow: styles.orderProductItemMainRow,
    itemContent: styles.orderProductItemContent,
    metaWrap: styles.orderProductMetaWrap,
    queueBadge: styles.orderProductQueueBadge,
    queueBadgeDot: styles.orderProductQueueBadgeDot,
    queueBadgeText: styles.orderProductQueueBadgeText,
    priceRow: styles.orderProductPriceRow,
    text: styles.orderProductText,
    subText: styles.orderProductSubText,
    qtyText: styles.orderProductQtyText,
    statusMarker: styles.orderProductStatusMarker,
    groupWrap: styles.groupWrap,
    groupTitlePill: styles.groupTitlePill,
    groupTitle: styles.groupTitle,
    groupItem: styles.groupItem,
    groupItemMainRow: styles.orderProductGroupItemRow,
    groupItemContent: styles.orderProductGroupItemContent,
    groupItemMetaWrap: styles.orderProductGroupItemMetaWrap,
    groupItemText: styles.groupItemText,
    groupItemMetaText: styles.orderProductGroupItemMetaText,
    groupItemPriceText: styles.orderProductGroupItemPriceText,
  }), [styles])
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
        status: { realStatus: ['open', 'pending'] },
        orderType: 'sale',
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
    if (!useTvPagedLayout || !tvLayout) return []

    return buildTvOrderSegments(
      sortedOrders,
      tvLayout.maxUnitsPerCard,
      tvLayout.charsPerLine,
    )
  }, [sortedOrders, tvLayout, useTvPagedLayout])

  const tvPages = useMemo(() => {
    if (!useTvPagedLayout || !tvLayout) return []

    return chunkItems(tvOrderSegments, tvLayout.cardsPerPage).map(items => ({
      items,
      totalUnits: items.reduce(
        (total, segment) => total + Number(segment?.totalUnits || 0),
        0,
      ),
    }))
  }, [tvLayout, tvOrderSegments, useTvPagedLayout])

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
    if (!useTvPagedLayout) return

    setTvCurrentPage(previousPage =>
      previousPage >= tvPages.length ? 0 : previousPage,
    )
  }, [tvPages.length, useTvPagedLayout])

  useEffect(() => {
    if (!useTvPagedLayout || tvPages.length <= 1) {
      return
    }

    const timer = setTimeout(() => {
      setTvCurrentPage(previousPage => (previousPage + 1) % tvPages.length)
    }, tvPageRotationMs)

    return () => clearTimeout(timer)
  }, [tvPageRotationMs, tvPages.length, tvCurrentPage, useTvPagedLayout])

  const renderOrderCard = useCallback(
    (itemOrRenderInfo, cardStyle = null) => {
      const compactMode = useTvPagedLayout
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
      const channelDisplay = channelLabel
      const price = Number(order?.price || 0)

      return (
        <View
          key={normalizedItem?.key || `order-card-${parseEntityId(order?.id) || segmentIndex}`}
          style={[
            styles.orderCard,
            compactMode && styles.tvOrderCard,
            cardStyle,
          ]}
        >
          <Pressable
            style={styles.orderCardPressable}
            onPress={() => {
              ordersActions.syncOrder?.(order)
              navigation.navigate('OrderDetails', {
                ...buildOrderDetailsRouteParams(order),
                kds: true,
                displayType: display?.displayType || route.params?.displayType,
                displayId: parseEntityId(display?.id) || parseEntityId(displayId),
                hideBottomToolBar: tvMode,
              })
            }}
          >
            <View style={[styles.orderAccentBar, { backgroundColor: statusVisual.textColor }]} />
            <View style={[styles.orderCardInner, compactMode && styles.tvOrderCardInner]}>
            <View style={[styles.orderTopRow, compactMode && styles.tvOrderTopRow]}>
              <View style={styles.orderIdentity}>
                <View style={[styles.orderIconWrap, compactMode && styles.tvOrderIconWrap]}>
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
                  <OrderIdentityLabel
                    order={order}
                    primaryTextStyle={[styles.orderTitle, compactMode && styles.tvOrderTitle]}
                    secondaryTextStyle={[
                      styles.orderTitleSecondary,
                      compactMode && styles.tvOrderTitleSecondary,
                    ]}
                  />
                  <Text style={[styles.orderDate, compactMode && styles.tvOrderDate]}>{formatOrderDate(orderDateValue)}</Text>
                </View>
              </View>

              <View style={styles.orderStatusWrap}>
                {isSplitSegment && compactMode ? (
                  <View style={styles.tvSegmentBadge}>
                    <Text style={styles.tvSegmentBadgeText}>
                      {segmentIndex + 1}/{segmentCount}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.orderStatusBadge,
                    compactMode && styles.tvOrderStatusBadge,
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
                      compactMode && styles.tvOrderStatusText,
                      { color: statusVisual.textColor },
                    ]}
                  >
                    {statusVisual.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.orderMetaRow, compactMode && styles.tvOrderMetaRow]}>
              <View style={[styles.waitingChip, compactMode && styles.tvWaitingChip]}>
                <MaterialCommunityIcons
                  name="clock-time-four-outline"
                  size={compactMode ? 10 : 12}
                  color={ppcColors.danger}
                />
                <Text style={[styles.waitingText, compactMode && styles.tvWaitingText]}>{waitingMinutes} min</Text>
              </View>

              <View style={styles.amountWrap}>
                <Text
                  style={[styles.channelMetaText, compactMode && styles.tvChannelMetaText]}
                  numberOfLines={compactMode ? 2 : 1}
                >
                  {channelDisplay}
                </Text>
                <Text style={[styles.amountText, compactMode && styles.tvAmountText]}>{Formatter.formatMoney(price)}</Text>
              </View>
            </View>

            {Array.isArray(order?.orderProducts) && order.orderProducts.length > 0 && (
              <View style={[styles.productsWrap, compactMode && styles.tvProductsWrap]}>
                <OrderProducts
                  order={order}
                  styles={orderProductsStyles}
                  showDetails
                  maxCards={compactMode ? 3 : 5}
                />
              </View>
            )}
            </View>
          </Pressable>
          {!tvMode && (
            <View style={styles.orderActions}>
              <PrintButton
                job={{ type: 'order', orderId: parseEntityId(order?.id) || order?.id }}
                store="orders"
                label="Imprimir pedido"
                iconColor={ppcColors.pillTextDark}
                style={styles.printActionButton}
                printerSelection={{
                  enabled: true,
                  context: 'display',
                  display,
                  displayId: display?.id,
                }}
              />
            </View>
          )}
        </View>
      );
    },
    [display?.displayType, display?.id, displayId, navigation, orderProductsStyles, ppcColors, route.params?.displayType, styles, tvMode, useTvPagedLayout],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {!tvMode && (
        <>
          <View
            style={styles.summaryCard}
          >
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
        </>
      )}

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
      ) : useTvPagedLayout ? (
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
          data={(tvMode ? sortedOrders : sortedOrders.slice(0, visibleCount))}
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
        <RealtimeDebugBar
          companyId={currentCompany?.id}
          ppcColors={ppcColors}
          refreshState={refreshDebug}
          websocketStatus={websocketStatus}
        />
      )}
    </SafeAreaView>
  )
}

export default Orders
