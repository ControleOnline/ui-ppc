import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useStore } from '@store'
import {
  DISPLAY_SIZE_DEFAULT,
  isDisplaySideBreakEnabled,
  parseConfigsObject,
  resolveDisplaySize,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import OrderHeader, {
  resolveDisplayedOrderStatus,
} from '@controleonline/ui-orders/src/react/components/OrderHeader'
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
import DisplayConferenceAutoPrintDispatcher from './DisplayConferenceAutoPrintDispatcher'
import TvAutoScrollView from './TvAutoScrollView'
import {
  appendPendingConferenceAutoPrintJob,
  buildConferenceAutoPrintMessageFingerprint,
  isConferenceOrderPrinted,
  isRelevantConferenceAutoPrintMessage,
  removePendingConferenceAutoPrintJob,
} from './conferenceAutoPrint'

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

const resolveDisplayLayoutScale = sizeLevel =>
  clamp(
    1 + ((Number(sizeLevel || DISPLAY_SIZE_DEFAULT) - DISPLAY_SIZE_DEFAULT) * 0.09),
    0.64,
    1.45,
  )

const TV_LAYOUT_GAP = 8
const TV_MIN_CARD_WIDTH = 300
const TV_SIDE_BREAK_MIN_COLUMNS = 4
const TV_BASE_PAGE_ROTATION_MS = 9000
const TV_MAX_PAGE_ROTATION_MS = 22000
const MAX_PROCESSED_CONFERENCE_PRINT_EVENTS = 200

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
    if (
      item?.productGroup &&
      (item?.showProductGroupInQueue === false || item?.show_product_group_in_queue === false)
    ) {
      return
    }

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

const estimateTvOrderUnits = (order, charsPerLine = 28) => {
  const products = getOrderProductsPreview(order, Number.POSITIVE_INFINITY)

  return products.reduce(
    (totalUnits, product) => totalUnits + estimateTvProductUnits(product, charsPerLine),
    0,
  )
}

const buildTvPageItems = (orders, charsPerLine = 28) =>
  (Array.isArray(orders) ? orders : []).map((order, index) => ({
    key: `tv-order-${parseEntityId(order?.id) || index}`,
    order,
    totalUnits: estimateTvOrderUnits(order, charsPerLine),
  }))

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
  if (width > 1920) return 6
  if (width >= 1600) return 5
  if (width >= 1200) return 4
  if (width >= 800) return 3
  if (width >= 600) return 2
  return 1
}

const resolveTvLayoutMetrics = ({
  width,
  height,
  summaryHeight,
  sectionHeight,
  footerHeight = 0,
  sizeScale = 1,
}) => {
  const contentWidth = Math.max(220, Math.round(width - 24))
  const availableHeight = Math.max(
    140,
    Math.round(height - summaryHeight - sectionHeight - footerHeight - 20),
  )
  const minCardWidth = Math.max(
    220,
    Math.round(TV_MIN_CARD_WIDTH * Number(sizeScale || 1)),
  )
  let columns = Math.max(
    TV_SIDE_BREAK_MIN_COLUMNS,
    getTvBaseColumns(width),
  )
  while (
    columns > TV_SIDE_BREAK_MIN_COLUMNS &&
    Math.floor((contentWidth - (TV_LAYOUT_GAP * (columns - 1))) / columns) < minCardWidth
  ) {
    columns -= 1
  }

  const rows = 1

  const cardWidth = Math.floor(
    (contentWidth - (TV_LAYOUT_GAP * (columns - 1))) / Math.max(1, columns),
  )
  const cardHeight = availableHeight
  const charsPerLine = clamp(
    Math.floor((cardWidth - 92) / 7),
    16,
    42,
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
  }
}

// Display exibe apenas pedidos em produção com workflow ainda aberto.


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
  const [pendingConferenceAutoPrintOrderIds, setPendingConferenceAutoPrintOrderIds] = useState([])
  const processedConferencePrintEventsRef = useRef(new Map())
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

  const linkedDisplayConfigs = useMemo(
    () => parseConfigsObject(linkedDisplayDeviceConfig?.configs),
    [linkedDisplayDeviceConfig?.configs],
  )

  const displaySize = useMemo(
    () => (tvMode ? resolveDisplaySize(linkedDisplayConfigs) : DISPLAY_SIZE_DEFAULT),
    [linkedDisplayConfigs, tvMode],
  )

  const displaySideBreakEnabled = useMemo(
    () => tvMode && isDisplaySideBreakEnabled(linkedDisplayConfigs),
    [linkedDisplayConfigs, tvMode],
  )

  const tvLayoutScale = useMemo(
    () => resolveDisplayLayoutScale(displaySize),
    [displaySize],
  )

  const useTvPagedLayout = displaySideBreakEnabled

  const tvLayout = useMemo(() => {
    if (!useTvPagedLayout) return null

    return resolveTvLayoutMetrics({
      width: effectiveWidth,
      height: effectiveHeight,
      summaryHeight,
      sectionHeight: sectionTitleHeight,
      footerHeight: tvMode ? debugBarHeight : 0,
      sizeScale: tvLayoutScale,
    })
  }, [
    debugBarHeight,
    effectiveHeight,
    effectiveWidth,
    sectionTitleHeight,
    summaryHeight,
    tvLayoutScale,
    tvMode,
    useTvPagedLayout,
  ])

  const configuredMinColumns = useMemo(() => {
    return parsePositiveInteger(linkedDisplayConfigs?.[DISPLAY_MIN_COLUMNS_CONFIG_KEY])
  }, [linkedDisplayConfigs])

  const columns = useMemo(() => {
    const responsiveColumns = useTvPagedLayout
      ? (tvLayout?.columns || 1)
      : getTvBaseColumns(Math.round(effectiveWidth / tvLayoutScale))

    return Math.max(responsiveColumns, configuredMinColumns || 1)
  }, [configuredMinColumns, effectiveWidth, tvLayout?.columns, tvLayoutScale, useTvPagedLayout])
  const tvCardMaxHeight = useMemo(() => {
    if (!tvMode) return null

    if (useTvPagedLayout && tvLayout?.cardHeight) {
      return tvLayout.cardHeight
    }

    return Math.max(220, Math.round(effectiveHeight - 12))
  }, [effectiveHeight, tvLayout?.cardHeight, tvMode, useTvPagedLayout])

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const useCompactTvStyles = tvMode || useTvPagedLayout
  const orderProductsStyles = useMemo(() => ({
    itemRow: [
      styles.orderProductItemRow,
      useCompactTvStyles && styles.tvOrderProductItemRow,
    ],
    itemMainRow: styles.orderProductItemMainRow,
    itemContent: styles.orderProductItemContent,
    metaWrap: [
      styles.orderProductMetaWrap,
      useCompactTvStyles && styles.tvOrderProductMetaWrap,
    ],
    queueBadge: [
      styles.orderProductQueueBadge,
      useCompactTvStyles && styles.tvOrderProductQueueBadge,
    ],
    queueBadgeDot: [
      styles.orderProductQueueBadgeDot,
      useCompactTvStyles && styles.tvOrderProductQueueBadgeDot,
    ],
    queueBadgeText: [
      styles.orderProductQueueBadgeText,
      useCompactTvStyles && styles.tvOrderProductQueueBadgeText,
    ],
    priceRow: styles.orderProductPriceRow,
    text: [
      styles.orderProductText,
      useCompactTvStyles && styles.tvOrderProductText,
    ],
    subText: [
      styles.orderProductSubText,
      useCompactTvStyles && styles.tvOrderProductSubText,
    ],
    qtyText: styles.orderProductQtyText,
    statusMarker: styles.orderProductStatusMarker,
    groupWrap: [styles.groupWrap, useCompactTvStyles && styles.tvGroupWrap],
    groupTitlePill: [
      styles.groupTitlePill,
      useCompactTvStyles && styles.tvGroupTitlePill,
    ],
    groupTitle: [styles.groupTitle, useCompactTvStyles && styles.tvGroupTitle],
    groupItem: [styles.groupItem, useCompactTvStyles && styles.tvGroupItem],
    groupItemMainRow: styles.orderProductGroupItemRow,
    groupItemContent: styles.orderProductGroupItemContent,
    groupItemMetaWrap: [
      styles.orderProductGroupItemMetaWrap,
      useCompactTvStyles && styles.tvOrderProductGroupItemMetaWrap,
    ],
    groupItemText: [
      styles.groupItemText,
      useCompactTvStyles && styles.tvGroupItemText,
    ],
    groupItemMetaText: [
      styles.orderProductGroupItemMetaText,
      useCompactTvStyles && styles.tvOrderProductGroupItemMetaText,
    ],
    groupItemPriceText: [
      styles.orderProductGroupItemPriceText,
      useCompactTvStyles && styles.tvOrderProductGroupItemPriceText,
    ],
  }), [styles, useCompactTvStyles])
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

  const markProcessedConferencePrintKeys = useCallback(keys => {
    keys.forEach(key => {
      processedConferencePrintEventsRef.current.set(key, Date.now())

      if (
        processedConferencePrintEventsRef.current.size >
        MAX_PROCESSED_CONFERENCE_PRINT_EVENTS
      ) {
        const oldestKey = processedConferencePrintEventsRef.current.keys().next().value
        processedConferencePrintEventsRef.current.delete(oldestKey)
      }
    })
  }, [])

  const fetchOrders = useCallback((source = 'manual', detail = '') => {
    if (!displayId || !currentCompany?.id) return

    setVisibleCount(50)
    actions
      .ordersQueue({
        status: { realStatus: ['open'] },
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

  useEffect(() => {
    processedConferencePrintEventsRef.current.clear()
    setPendingConferenceAutoPrintOrderIds([])
  }, [currentCompany?.id, selectedDisplayId])

  const listCount = sortedOrders.length

  const tvPageItems = useMemo(() => {
    if (!useTvPagedLayout || !tvLayout) return []

    return buildTvPageItems(
      sortedOrders,
      tvLayout.charsPerLine,
    )
  }, [sortedOrders, tvLayout, useTvPagedLayout])

  const tvPages = useMemo(() => {
    if (!useTvPagedLayout || !tvLayout) return []

    return chunkItems(tvPageItems, tvLayout.cardsPerPage).map(items => ({
      items,
      totalUnits: items.reduce(
        (total, segment) => total + Number(segment?.totalUnits || 0),
        0,
      ),
    }))
  }, [tvLayout, tvPageItems, useTvPagedLayout])

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
    const incomingMessages = (Array.isArray(ordersMessages) ? ordersMessages : [])
      .filter(message =>
        isMessageForCompany(message, currentCompany?.id) &&
        isRelevantConferenceAutoPrintMessage(message),
      )

    if (incomingMessages.length === 0) {
      return
    }

    const unseenMessages = incomingMessages
      .map(message => ({
        fingerprint: buildConferenceAutoPrintMessageFingerprint(message),
        orderId: parseEntityId(message?.order),
      }))
      .filter(entry => entry.fingerprint && entry.orderId)
      .filter(
        entry => !processedConferencePrintEventsRef.current.has(entry.fingerprint),
      )

    if (unseenMessages.length === 0) {
      return
    }

    markProcessedConferencePrintKeys(
      unseenMessages.map(entry => entry.fingerprint),
    )

    setPendingConferenceAutoPrintOrderIds(currentJobs => {
      let nextJobs = Array.isArray(currentJobs) ? [...currentJobs] : []

      unseenMessages.forEach(entry => {
        const matchedOrder = sortedOrders.find(
          order => parseEntityId(order?.id) === entry.orderId,
        )

        if (matchedOrder && isConferenceOrderPrinted(matchedOrder)) {
          return
        }

        nextJobs = appendPendingConferenceAutoPrintJob(nextJobs, entry.orderId)
      })

      return nextJobs
    })
  }, [currentCompany?.id, markProcessedConferencePrintKeys, ordersMessages, sortedOrders])

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
      const compactMode = useCompactTvStyles
      const shouldUseTvPagedCardFrame = useTvPagedLayout
      const normalizedItem =
        itemOrRenderInfo?.item &&
        !itemOrRenderInfo?.order &&
        !itemOrRenderInfo?.products
          ? itemOrRenderInfo.item
          : itemOrRenderInfo

      const order = normalizedItem?.order || normalizedItem
      const displayedOrderProducts = Array.isArray(normalizedItem?.products)
        ? normalizedItem.products
        : null
      const statusVisual = getStatusVisual(order, ppcColors)
      const visibleOrderProducts = displayedOrderProducts || order?.orderProducts
      const hasVisibleProducts =
        Array.isArray(visibleOrderProducts) && visibleOrderProducts.length > 0
      const productsContent = hasVisibleProducts ? (
        <View style={[styles.productsContent, compactMode && styles.tvProductsContent]}>
          <OrderProducts
            order={order}
            orderProducts={displayedOrderProducts}
            styles={orderProductsStyles}
            showDetails
            maxCards={tvMode ? null : 5}
          />
        </View>
      ) : null

      return (
        <View
          key={normalizedItem?.key || `order-card-${parseEntityId(order?.id) || 0}`}
          style={[
            styles.orderCard,
            shouldUseTvPagedCardFrame && styles.tvOrderCard,
            tvMode && tvCardMaxHeight ? { maxHeight: tvCardMaxHeight } : null,
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
            <View
              style={[
                styles.orderAccentBar,
                compactMode && styles.tvOrderAccentBar,
                { backgroundColor: statusVisual.textColor },
              ]}
            />
            <View style={[styles.orderCardInner, compactMode && styles.tvOrderCardInner]}>
              <OrderHeader order={order} isKds />

              {hasVisibleProducts && (
                <View style={[styles.productsWrap, compactMode && styles.tvProductsWrap]}>
                  {tvMode ? (
                    <TvAutoScrollView
                      enabled={tvMode}
                      style={styles.productsViewport}
                      contentContainerStyle={styles.productsScrollContent}
                    >
                      {productsContent}
                    </TvAutoScrollView>
                  ) : productsContent}
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
    [
      display?.displayType,
      display?.id,
      displayId,
      navigation,
      orderProductsStyles,
      ppcColors,
      route.params?.displayType,
      styles,
      tvMode,
      tvCardMaxHeight,
      useCompactTvStyles,
      useTvPagedLayout,
    ],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {pendingConferenceAutoPrintOrderIds.length > 0 ? (
        <DisplayConferenceAutoPrintDispatcher
          display={display}
          displayId={selectedDisplayId || display?.id || displayId}
          orderIds={pendingConferenceAutoPrintOrderIds}
          onJobSettled={orderId => {
            setPendingConferenceAutoPrintOrderIds(currentJobs =>
              removePendingConferenceAutoPrintJob(currentJobs, orderId),
            )
          }}
        />
      ) : null}

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
          key={`orders-cols-${columns}-size-${displaySize}`}
          numColumns={columns}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderCard}
          columnWrapperStyle={
            columns > 1
              ? (tvMode ? styles.tvColumnWrapper : styles.columnWrapper)
              : null
          }
          contentContainerStyle={tvMode ? styles.tvList : styles.list}
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
