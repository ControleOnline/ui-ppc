import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import {
  resolveDisplayedOrderStatus,
} from '@controleonline/ui-orders/src/react/components/OrderHeader'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { withOpacity } from '@controleonline/../../src/styles/branding'
import { normalizeEntityId } from '@controleonline/ui-common/src/react/utils/paymentDevices'

import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton'
import RealtimeDebugBar from '@controleonline/ui-ppc/src/react/components/RealtimeDebugBar'
import { buildOrderDetailsRouteParams } from '@controleonline/ui-orders/src/react/utils/orderRoute'
import { resolveDisplayTicketSummary } from '@controleonline/ui-ppc/src/react/pages/displays/products/displayPrintRules'
import resolveResponsiveOrderColumns from './responsiveColumns'
import {
  DISPLAY_ORDERS_PAGE_SIZE,
  extractCollectionItems,
  extractCollectionTotalItems,
  flattenOrdersPages,
  getNextOrdersPageNumber,
  hasMoreOrdersPages,
  mergeOrdersPage,
} from './ordersPagination'
import createStyles from './index.styles'
import DisplayDeliveryMap from './DisplayDeliveryMap'
import DisplayConferenceAutoPrintDispatcher from './DisplayConferenceAutoPrintDispatcher'
import TvAutoScrollView from './TvAutoScrollView'
import {
  appendPendingConferenceAutoPrintJob,
  buildConferenceAutoPrintMessageFingerprint,
  isConferenceOrderPrinted,
  isRelevantConferenceAutoPrintMessage,
  removePendingConferenceAutoPrintJob,
} from './conferenceAutoPrint'

const { isDisplayVisibleOrder } = require('./orderVisibility')
const normalizeText = value => String(value || '').trim()

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

const MAX_PROCESSED_CONFERENCE_PRINT_EVENTS = 200
const TV_LAYOUT_GAP = 8
const TV_BASE_PAGE_ROTATION_MS = 9000
const TV_MAX_PAGE_ROTATION_MS = 22000

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const normalizeQuantity = value => {
  const numericValue = Number(value || 0)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

const formatQuantityPrefix = value => {
  const quantity = normalizeQuantity(value)
  return quantity > 2 ? `${quantity}x ` : ''
}

const getOrderProductsPreview = (order, maxItems = 5) => {
  const items = Array.isArray(order?.orderProducts) ? order.orderProducts : []
  const map = new Map()

  items.forEach(item => {
    const product = item?.product || {}
    const shouldShowInParentQueue =
      item?.showInParentQueue !== false &&
      item?.show_in_parent_queue !== false &&
      item?.showProductGroupInQueue !== false &&
      item?.show_product_group_in_queue !== false
    const hasParentGroup = !!item?.productGroup
    const shouldNestInParent = hasParentGroup && shouldShowInParentQueue
    const parentId = shouldNestInParent
      ? item?.productGroup?.parentProduct?.id || product?.id
      : item?.id || product?.id

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

    if (!shouldNestInParent) {
      parent.quantity += Number(item?.quantity || 1)
    }

    if (shouldNestInParent) {
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

const estimateTextUnits = (value, charsPerLine = 28) => {
  const normalized = normalizeText(value)
  if (!normalized) return 0

  const safeCharsPerLine = Math.max(12, Math.round(Number(charsPerLine || 0)))
  return Math.max(1, Math.ceil(normalized.length / safeCharsPerLine))
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

const resolveTvLayoutMetrics = ({
  width,
  height,
  summaryHeight,
  sectionHeight,
  footerHeight = 0,
  columns = 1,
}) => {
  const contentWidth = Math.max(220, Math.round(width - 24))
  const availableHeight = Math.max(
    140,
    Math.round(height - summaryHeight - sectionHeight - footerHeight - 20),
  )
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
    rows: 1,
    cardWidth,
    cardHeight,
    contentWidth,
    availableHeight,
    cardsPerPage: Math.max(1, columns),
    charsPerLine,
  }
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

const getFirstResponseMember = response => {
  if (Array.isArray(response?.member)) return response.member[0] || null
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'][0] || null
  return response && typeof response === 'object' ? response : null
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

// Display exibe apenas pedidos em produção com workflow ainda aberto.


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
  const { messages: queueMessages } = getters
  const ordersActions = ordersStore.actions
  const ordersMessages = ordersStore?.getters?.messages
  const websocketStatus = websocketStore?.getters?.summary || {}
  const websocketConnected = Boolean(websocketStatus?.connected)
  const { currentCompany } = peopleStore.getters
  const { ppcColors } = useDisplayTheme()

  const [ordersPages, setOrdersPages] = useState({})
  const [isInitialOrdersLoading, setIsInitialOrdersLoading] = useState(false)
  const [summaryHeight] = useState(0)
  const [sectionTitleHeight] = useState(0)
  const [debugBarHeight] = useState(0)
  const [tvCurrentPage, setTvCurrentPage] = useState(0)
  const [deliveryMapPayload, setDeliveryMapPayload] = useState(null)
  const [deliveryMapLoading, setDeliveryMapLoading] = useState(false)
  const [deliveryMapError, setDeliveryMapError] = useState('')
  const [refreshDebug, setRefreshDebug] = useState({
    lastAt: null,
    lastSource: 'boot',
    lastDetail: 'startup',
  })
  const [pendingConferenceAutoPrintOrderIds, setPendingConferenceAutoPrintOrderIds] = useState([])
  const processedConferencePrintEventsRef = useRef(new Map())
  const ordersPagesRef = useRef({})
  const ordersTotalItemsRef = useRef(0)
  const ordersLoadingPagesRef = useRef(new Map())
  const ordersFeedGenerationRef = useRef(0)
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
  const useTvPagedLayout = tvMode

  const columns = useMemo(
    () => resolveResponsiveOrderColumns(effectiveWidth),
    [effectiveWidth],
  )

  const tvLayout = useMemo(() => {
    if (!useTvPagedLayout) return null

    return resolveTvLayoutMetrics({
      width: effectiveWidth,
      height: effectiveHeight,
      summaryHeight,
      sectionHeight: sectionTitleHeight,
      footerHeight: tvMode ? debugBarHeight : 0,
      columns,
    })
  }, [
    columns,
    debugBarHeight,
    effectiveHeight,
    effectiveWidth,
    sectionTitleHeight,
    summaryHeight,
    tvMode,
    useTvPagedLayout,
  ])

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
  const hasOrderFeedRefreshed = Boolean(refreshDebug.lastAt)

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

  const loadOrdersPage = useCallback(async (page = 1, source = 'manual', detail = '') => {
    if (!displayId || !currentCompany?.id) return []

    const targetPage = Math.max(1, Number(page || 1))
    const requestGeneration = ordersFeedGenerationRef.current

    if (ordersLoadingPagesRef.current.get(targetPage) === requestGeneration) {
      return []
    }

    ordersLoadingPagesRef.current.set(targetPage, requestGeneration)

    if (targetPage === 1) {
      setIsInitialOrdersLoading(true)
    }

    try {
      const response = await api.fetch('/orders-queue', {
        params: {
          status: { realStatus: ['open'] },
          orderType: 'sale',
          provider: currentCompany.id,
          'order[alterDate]': 'asc',
          page: targetPage,
          itemsPerPage: DISPLAY_ORDERS_PAGE_SIZE,
        },
      })

      if (requestGeneration !== ordersFeedGenerationRef.current) {
        return []
      }

      const pageItems = extractCollectionItems(response)
      const totalItems = extractCollectionTotalItems(response)
      const nextPages = mergeOrdersPage(ordersPagesRef.current, targetPage, pageItems)

      ordersPagesRef.current = nextPages
      ordersTotalItemsRef.current = totalItems
      setOrdersPages(nextPages)
      noteRefresh(source, `page ${targetPage}${detail ? ` (${detail})` : ''}`)

      return pageItems
    } catch {
      if (requestGeneration === ordersFeedGenerationRef.current) {
        noteRefresh(source, `page ${targetPage} failed`)
      }

      return []
    } finally {
      if (ordersLoadingPagesRef.current.get(targetPage) === requestGeneration) {
        ordersLoadingPagesRef.current.delete(targetPage)

        if (targetPage === 1) {
          setIsInitialOrdersLoading(false)
        }
      }
    }
  }, [
    currentCompany?.id,
    displayId,
    noteRefresh,
  ])

  const fetchDeliveryMapPayload = useCallback(async () => {
    if (!currentCompany?.id) return null

    const response = await api.fetch('orders-delivery-map', {
      params: {
        provider: `/people/${currentCompany.id}`,
      },
    })

    return getFirstResponseMember(response)
  }, [currentCompany?.id])

  const refreshOrders = useCallback(
    (source = 'manual', detail = '') => loadOrdersPage(1, source, detail),
    [loadOrdersPage],
  )

  const loadMoreOrders = useCallback(() => {
    if (!hasMoreOrdersPages(ordersPagesRef.current, ordersTotalItemsRef.current)) {
      return
    }

    const nextPage = getNextOrdersPageNumber(ordersPagesRef.current)
    loadOrdersPage(nextPage, 'scroll', 'load-more')
  }, [loadOrdersPage])

  const sortedOrders = useMemo(() => {
    const loadedOrders = flattenOrdersPages(ordersPages)
    if (!Array.isArray(loadedOrders)) return []

    return loadedOrders.filter(isDisplayVisibleOrder)
  }, [ordersPages])

  const showSkeleton =
    isInitialOrdersLoading &&
    sortedOrders.length === 0 &&
    !(tvMode && hasOrderFeedRefreshed)

  useEffect(() => {
    ordersFeedGenerationRef.current += 1
    ordersPagesRef.current = {}
    ordersTotalItemsRef.current = 0
    ordersLoadingPagesRef.current.clear()
    setOrdersPages({})
    setIsInitialOrdersLoading(false)
    processedConferencePrintEventsRef.current.clear()
    setPendingConferenceAutoPrintOrderIds([])
  }, [currentCompany?.id, selectedDisplayId])

  const listCount = sortedOrders.length
  const shouldRenderDeliveryMap =
    tvMode && hasOrderFeedRefreshed && !showSkeleton && listCount === 0

  useEffect(() => {
    if (!shouldRenderDeliveryMap) {
      setDeliveryMapPayload(null)
      setDeliveryMapLoading(false)
      setDeliveryMapError('')
      return undefined
    }

    let cancelled = false

    setDeliveryMapLoading(true)
    setDeliveryMapError('')

    fetchDeliveryMapPayload()
      .then(payload => {
        if (cancelled) return
        setDeliveryMapPayload(payload)
      })
      .catch(() => {
        if (cancelled) return
        setDeliveryMapPayload(null)
        setDeliveryMapError('Nao foi possivel carregar as entregas recentes.')
      })
      .finally(() => {
        if (!cancelled) setDeliveryMapLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchDeliveryMapPayload, shouldRenderDeliveryMap])

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

  useEffect(() => {
    if (!useTvPagedLayout || !tvPages.length) {
      return
    }

    if (!hasMoreOrdersPages(ordersPagesRef.current, ordersTotalItemsRef.current)) {
      return
    }

    if (tvCurrentPage < tvPages.length - 1) {
      return
    }

    loadMoreOrders()
  }, [
    loadMoreOrders,
    tvCurrentPage,
    tvPages.length,
    useTvPagedLayout,
  ])

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
      refreshOrders('socket', refreshSources.join('+'))
    }, 220)

    return () => clearTimeout(refreshTimeout)
  }, [
    actions,
    currentCompany?.id,
    hasOrderRefreshMessage,
    hasQueueRefreshMessage,
    ordersActions,
    ordersMessages,
    queueMessages,
    refreshOrders,
  ])

  useFocusEffect(
    useCallback(() => {
      refreshOrders('focus', 'screen-focus')
      const refreshIntervalMs = websocketConnected ? 30000 : 20000

      const interval = setInterval(() => {
        refreshOrders(
          'interval',
          websocketConnected ? 'connected-poll' : 'fallback-poll',
        )
      }, refreshIntervalMs)

      return () => clearInterval(interval)
    }, [refreshOrders, websocketConnected]),
  )

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
      const statusVisual = getStatusVisual(order, ppcColors)
      const visibleOrderProducts = Array.isArray(order?.orderProducts)
        ? order.orderProducts
        : []
      const hasVisibleProducts = visibleOrderProducts.length > 0
      const productsContent = hasVisibleProducts ? (
        <View style={[styles.productsContent, compactMode && styles.tvProductsContent]}>
          <OrderProducts
            order={order}
            styles={orderProductsStyles}
            showDetails
            maxCards={tvMode ? null : 5}
            showRootQuantityPrefix={false}
          />
        </View>
      ) : null
      const ticketSummary = resolveDisplayTicketSummary(order)

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
              <OrderStackedTopBar
                order={order}
                isKds
                orderHeaderProps={{
                  showWaitingTime: false,
                  metaText: ticketSummary.clientName,
                }}
                showActions={false}
                showBackButton={false}
              />

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
                {isInitialOrdersLoading && listCount === 0 ? (
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
      ) : shouldRenderDeliveryMap ? (
        <DisplayDeliveryMap
          payload={deliveryMapPayload}
          isLoading={deliveryMapLoading}
          error={deliveryMapError}
          ppcColors={ppcColors}
          tvMode={tvMode}
        />
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
          data={sortedOrders}
          key={`orders-cols-${columns}`}
          numColumns={columns}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderCard}
          columnWrapperStyle={
            columns > 1
              ? (tvMode ? styles.tvColumnWrapper : styles.columnWrapper)
              : null
          }
          contentContainerStyle={tvMode ? styles.tvList : styles.list}
          onEndReached={loadMoreOrders}
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
