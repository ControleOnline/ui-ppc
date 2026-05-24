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
import { getDateRange } from '@controleonline/ui-common/src/react/utils/dateRangeFilter'

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
import OperationalInsightsDock from './OperationalInsightsDock'

const { isDisplayVisibleOrder } = require('./orderVisibility')

const formatDebugClock = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const pad = entry => String(entry).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const MAX_PROCESSED_CONFERENCE_PRINT_EVENTS = 200

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
  const { width } = useWindowDimensions()
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

  const selectedDisplayId = useMemo(
    () => normalizeEntityId(display?.id || display?.['@id'] || displayId),
    [display, displayId],
  )

  const columns = useMemo(
    () => resolveResponsiveOrderColumns(effectiveWidth),
    [effectiveWidth],
  )

  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const useCompactTvStyles = false
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

  const operationalInsightsFilters = useMemo(() => {
    if (!currentCompany?.id) return null

    const dateRange = getDateRange('today', null, {
      relativeMode: 'rolling',
      useCurrentMoment: true,
    })

    return {
      provider: `/people/${currentCompany.id}`,
      orderType: 'sale',
      ...(dateRange?.after ? { 'orderDate[after]': dateRange.after } : {}),
      ...(dateRange?.before ? { 'orderDate[before]': dateRange.before } : {}),
    }
  }, [currentCompany?.id])

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
            showPricing={false}
            maxCards={tvMode ? null : 5}
            showRootQuantityPrefix={false}
            showHierarchyGuides={
              String(display?.displayType || route.params?.displayType || '').toLowerCase() === 'orders'
            }
          />
        </View>
      ) : null
      const ticketSummary = resolveDisplayTicketSummary(order)

      return (
        <View
          key={normalizedItem?.key || `order-card-${parseEntityId(order?.id) || 0}`}
          style={[
            styles.orderCard,
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
      useCompactTvStyles,
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
      ) : tvMode ? (
        shouldRenderDeliveryMap ? (
          <View style={styles.tvMapStage}>
            <DisplayDeliveryMap
              payload={deliveryMapPayload}
              isLoading={deliveryMapLoading}
              error={deliveryMapError}
              ppcColors={ppcColors}
              tvMode={tvMode}
            />

            <OperationalInsightsDock
              filters={operationalInsightsFilters || null}
              ppcColors={ppcColors}
              periodLabel="Hoje"
            />
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
                ? styles.tvColumnWrapper
                : null
            }
            contentContainerStyle={styles.tvList}
            onEndReached={loadMoreOrders}
            onEndReachedThreshold={0.3}
          />
        )
      ) : (
        <FlatList
          data={sortedOrders}
          key={`orders-cols-${columns}`}
          numColumns={columns}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderCard}
          columnWrapperStyle={
            columns > 1
              ? styles.columnWrapper
              : null
          }
          contentContainerStyle={styles.list}
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
