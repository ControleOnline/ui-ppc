import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Dimensions, FlatList, Text, View, useWindowDimensions } from 'react-native'
import { Card } from 'react-native-paper'
import { useIsFocused } from '@react-navigation/native'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import { needsDetailedOrderProductsFetch } from '@controleonline/ui-orders/src/react/utils/orderProductsFetchPolicy'
import createOrderStyles from '@controleonline/ui-ppc/src/react/pages/displays/orders/index.styles'
import DisplayDeliveryMap from '@controleonline/ui-ppc/src/react/pages/displays/orders/DisplayDeliveryMap'
import OperationalInsightsDock from '@controleonline/ui-ppc/src/react/pages/displays/orders/OperationalInsightsDock'
import {
  DISPLAY_ORDERS_PAGE_SIZE,
  extractCollectionItems,
  extractCollectionTotalItems,
  flattenOrdersPages,
  getNextOrdersPageNumber,
  hasMoreOrdersPages,
  mergeOrdersPage,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/ordersPagination'
import {
  buildDisplayOrdersQueueQuery,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/ordersFilters'
import {
  resolveResponsiveOrderColumns,
  resolveResponsiveOrderViewportWidth,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/responsiveColumns'
import { isDisplayVisibleOrder } from '@controleonline/ui-ppc/src/react/pages/displays/orders/orderVisibility'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import {
  DEFAULT_DATE_FILTER_KEY,
  getDateRange,
} from '@controleonline/ui-common/src/react/utils/dateRangeFilter'
import createStyles from './index.styles'

const orderDetailsCache = new Map()
const pendingOrderDetailsRequests = new Map()

const normalizeEntityId = value => {
  if (!value) return null
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) return Number(trimmed)

    const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/)
    if (iriMatch?.[1]) return Number(iriMatch[1])
  }

  if (typeof value?.id === 'number') return value.id
  if (typeof value?.id === 'string') return normalizeEntityId(value.id)
  if (value?.['@id']) return normalizeEntityId(String(value['@id']))

  return null
}

const getHydraCollection = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.member)) return value.member
  if (Array.isArray(value?.['hydra:member'])) return value['hydra:member']
  return null
}

const getFirstResponseMember = response => {
  if (Array.isArray(response?.member)) return response.member[0] || null
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'][0] || null
  return response && typeof response === 'object' ? response : null
}

const resolveCollectionValue = (...candidates) => {
  for (const candidate of candidates) {
    const collectionItems = getHydraCollection(candidate)
    if (collectionItems) {
      return collectionItems
    }
  }

  return null
}

const mergeNestedEntity = (baseEntity, nextEntity) => {
  if (!baseEntity || typeof baseEntity !== 'object') {
    return nextEntity || baseEntity
  }

  if (!nextEntity || typeof nextEntity !== 'object') {
    return baseEntity
  }

  return {
    ...baseEntity,
    ...nextEntity,
  }
}

const mergeOrderPayload = (baseOrder, detailedOrder) => {
  if (!detailedOrder || typeof detailedOrder !== 'object') {
    return baseOrder
  }

  const mergedOrder = {
    ...baseOrder,
    ...detailedOrder,
    client: mergeNestedEntity(baseOrder?.client, detailedOrder?.client),
    provider: mergeNestedEntity(baseOrder?.provider, detailedOrder?.provider),
    status: mergeNestedEntity(baseOrder?.status, detailedOrder?.status),
    payer: mergeNestedEntity(baseOrder?.payer, detailedOrder?.payer),
    mainOrder: mergeNestedEntity(baseOrder?.mainOrder, detailedOrder?.mainOrder),
    deliveryContact: mergeNestedEntity(
      baseOrder?.deliveryContact,
      detailedOrder?.deliveryContact,
    ),
    addressOrigin: mergeNestedEntity(
      baseOrder?.addressOrigin,
      detailedOrder?.addressOrigin,
    ),
    addressDestination: mergeNestedEntity(
      baseOrder?.addressDestination,
      detailedOrder?.addressDestination,
    ),
  }

  const orderProducts = resolveCollectionValue(
    detailedOrder?.orderProducts,
    detailedOrder?.order_product,
    detailedOrder?.order_products,
    baseOrder?.orderProducts,
    baseOrder?.order_product,
    baseOrder?.order_products,
  )

  if (orderProducts) {
    mergedOrder.orderProducts = orderProducts
    mergedOrder.order_product = orderProducts
    mergedOrder.order_products = orderProducts
  }

  return mergedOrder
}

const cacheDetailedOrder = order => {
  const orderId = normalizeEntityId(order?.id || order?.['@id'])
  if (!orderId || !order || typeof order !== 'object') {
    return order
  }

  orderDetailsCache.set(String(orderId), order)
  return order
}

const loadDetailedOrder = async orderId => {
  const cacheKey = String(orderId)

  if (orderDetailsCache.has(cacheKey)) {
    return orderDetailsCache.get(cacheKey)
  }

  if (pendingOrderDetailsRequests.has(cacheKey)) {
    return pendingOrderDetailsRequests.get(cacheKey)
  }

  const request = api
    .fetch(`orders/${orderId}`)
    .then(async baseOrder => {
      if (!baseOrder || typeof baseOrder !== 'object') {
        return null
      }

      const orderProducts = normalizeOrderProductCollection(baseOrder)

      if (
        orderProducts.length === 0 ||
        !needsDetailedOrderProductsFetch(orderProducts)
      ) {
        return cacheDetailedOrder(baseOrder)
      }

      try {
        const detailedOrder = await api.fetch(`orders/${orderId}/conference`)
        return cacheDetailedOrder(mergeOrderPayload(baseOrder, detailedOrder))
      } catch {
        return cacheDetailedOrder(baseOrder)
      }
    })
    .catch(() => null)
    .finally(() => {
      pendingOrderDetailsRequests.delete(cacheKey)
    })

  pendingOrderDetailsRequests.set(cacheKey, request)
  return request
}

const normalizeOrderProductCollection = order => {
  const collections = [
    order?.orderProducts,
    order?.order_product,
    order?.order_products,
  ]

  for (const collection of collections) {
    const items = getHydraCollection(collection)
    if (items) {
      return items
    }
  }

  return []
}

export const TvOrderCard = ({
  order,
  ppcColors,
  styles,
  orderStyles,
  isLoadingDetails = false,
}) => {
  const orderProductsStyles = useMemo(
    () => ({
      itemRow: orderStyles.orderProductItemRow,
      itemMainRow: orderStyles.orderProductItemMainRow,
      itemLead: orderStyles.orderProductItemLead,
      itemThumbWrap: orderStyles.orderProductItemThumbWrap,
      itemThumbImage: orderStyles.orderProductItemThumbImage,
      itemThumbPlaceholder: orderStyles.orderProductItemThumbPlaceholder,
      itemThumbPlaceholderText: orderStyles.orderProductItemThumbPlaceholderText,
      itemContent: orderStyles.orderProductItemContent,
      metaWrap: orderStyles.orderProductMetaWrap,
      queueBadge: orderStyles.orderProductQueueBadge,
      queueBadgeDot: orderStyles.orderProductQueueBadgeDot,
      queueBadgeText: orderStyles.orderProductQueueBadgeText,
      itemActions: orderStyles.orderProductItemActions,
      priceRow: orderStyles.orderProductPriceRow,
      text: orderStyles.orderProductText,
      subText: orderStyles.orderProductSubText,
      qtyText: orderStyles.orderProductQtyText,
      statusMarker: orderStyles.orderProductStatusMarker,
      groupWrap: orderStyles.groupWrap,
      groupTitlePill: orderStyles.groupTitlePill,
      groupTitle: orderStyles.groupTitle,
      groupItem: orderStyles.groupItem,
      groupItemMainRow: orderStyles.orderProductGroupItemRow,
      groupItemContent: orderStyles.orderProductGroupItemContent,
      groupItemMetaWrap: orderStyles.orderProductGroupItemMetaWrap,
      groupItemActions: orderStyles.orderProductGroupItemActions,
      groupItemText: orderStyles.groupItemText,
      groupItemMetaText: orderStyles.orderProductGroupItemMetaText,
      groupItemPriceText: orderStyles.orderProductGroupItemPriceText,
    }),
    [orderStyles],
  )

  const statusColor = order?.status?.color || ppcColors.accentInfo
  const orderProducts = normalizeOrderProductCollection(order)

  return (
    <Card style={styles.orderCard}>
      <View style={[styles.orderAccentBar, { backgroundColor: statusColor }]} />
      <Card.Content style={styles.orderCardContent}>
        <OrderHeader
          order={order}
          isKds={false}
          showWaitingTime={false}
          metaText={order?.client?.name || ''}
        />

        {isLoadingDetails ? (
          <View style={styles.loadingInlineWrap}>
            <ActivityIndicator size="small" color={ppcColors.accentInfo} />
            <Text style={styles.loadingInlineText}>Carregando detalhes...</Text>
          </View>
        ) : null}

        {orderProducts.length > 0 ? (
          <View style={styles.productsWrap}>
            <OrderProducts
              order={order}
              styles={orderProductsStyles}
              showDetails
              showDescriptions
              showPricing
              showImages={false}
              showRootQuantityPrefix
              showQueuePresentation
              showHierarchyGuides
            />
          </View>
        ) : null}
      </Card.Content>
    </Card>
  )
}

const TvDisplay = ({ display = {} }) => {
  const isFocused = useIsFocused()
  const { currentCompany } = useStore('people').getters
  const { ppcColors } = useDisplayTheme()
  const tvStyles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const orderStyles = useMemo(() => createOrderStyles(ppcColors), [ppcColors])
  const { width } = useWindowDimensions()
  const screenWidth = Number(Dimensions.get('screen')?.width || 0)
  const columns = useMemo(
    () =>
      resolveResponsiveOrderColumns(
        resolveResponsiveOrderViewportWidth(width, screenWidth),
      ),
    [screenWidth, width],
  )
  const [ordersPages, setOrdersPages] = useState({})
  const [detailedOrdersById, setDetailedOrdersById] = useState({})
  const [isInitialOrdersLoading, setIsInitialOrdersLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasOrdersFeedRefreshed, setHasOrdersFeedRefreshed] = useState(false)
  const [deliveryMapPayload, setDeliveryMapPayload] = useState(null)
  const [deliveryMapLoading, setDeliveryMapLoading] = useState(false)
  const [deliveryMapError, setDeliveryMapError] = useState('')
  const ordersPagesRef = useRef({})
  const ordersTotalItemsRef = useRef(0)
  const ordersLoadingPagesRef = useRef(new Map())
  const ordersFeedGenerationRef = useRef(0)

  const resetOrdersFeed = useCallback(() => {
    ordersFeedGenerationRef.current += 1
    ordersPagesRef.current = {}
    ordersTotalItemsRef.current = 0
    ordersLoadingPagesRef.current.clear()
    setOrdersPages({})
    setDetailedOrdersById({})
    setHasOrdersFeedRefreshed(false)
    setDeliveryMapPayload(null)
    setDeliveryMapLoading(false)
    setDeliveryMapError('')
    setIsInitialOrdersLoading(false)
    setLoadingMore(false)
  }, [])

  const loadOrdersPage = useCallback(async (page = 1) => {
    if (!currentCompany?.id) return []

    const targetPage = Math.max(1, Number(page || 1))
    const requestGeneration = ordersFeedGenerationRef.current

    if (ordersLoadingPagesRef.current.get(targetPage) === requestGeneration) {
      return []
    }

    ordersLoadingPagesRef.current.set(targetPage, requestGeneration)

    if (targetPage === 1) {
      setIsInitialOrdersLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const query = buildDisplayOrdersQueueQuery({
        companyId: currentCompany.id,
        dateFilterKey: DEFAULT_DATE_FILTER_KEY,
        customDateRange: null,
        statusFilter: 'open',
        appFilter: 'all',
        itemsPerPage: DISPLAY_ORDERS_PAGE_SIZE,
        page: targetPage,
      })

      if (!query) {
        return []
      }

      const response = await api.fetch('/orders', {
        params: query,
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
      if (targetPage === 1) {
        setHasOrdersFeedRefreshed(true)
      }

      return pageItems
    } catch {
      return []
    } finally {
      if (ordersLoadingPagesRef.current.get(targetPage) === requestGeneration) {
        ordersLoadingPagesRef.current.delete(targetPage)

        if (targetPage === 1) {
          setIsInitialOrdersLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    }
  }, [currentCompany?.id])

  const refreshOrders = useCallback(() => {
    resetOrdersFeed()
    return loadOrdersPage(1)
  }, [loadOrdersPage, resetOrdersFeed])

  const loadMoreOrders = useCallback(() => {
    if (!hasMoreOrdersPages(ordersPagesRef.current, ordersTotalItemsRef.current)) {
      return
    }

    const nextPage = getNextOrdersPageNumber(ordersPagesRef.current)
    loadOrdersPage(nextPage)
  }, [loadOrdersPage])

  const sortedOrders = useMemo(
    () =>
      flattenOrdersPages(ordersPages).filter(order =>
        isDisplayVisibleOrder(order, 'open'),
      ),
    [ordersPages],
  )

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

  const shouldRenderDeliveryMap =
    hasOrdersFeedRefreshed &&
    !isInitialOrdersLoading &&
    sortedOrders.length === 0

  useEffect(() => {
    if (!shouldRenderDeliveryMap) {
      setDeliveryMapPayload(null)
      setDeliveryMapLoading(false)
      setDeliveryMapError('')
      return undefined
    }

    let cancelled = false

    const fetchDeliveryMapPayload = async () => {
      if (!currentCompany?.id) return null

      const response = await api.fetch('orders-delivery-map', {
        params: {
          provider: `/people/${currentCompany.id}`,
        },
      })

      return getFirstResponseMember(response)
    }

    setDeliveryMapLoading(true)
    setDeliveryMapError('')

    fetchDeliveryMapPayload()
      .then(payload => {
        if (cancelled) {
          return
        }

        setDeliveryMapPayload(payload)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setDeliveryMapPayload(null)
        setDeliveryMapError(
          global.t?.t('display', 'message', 'unableLoadRecentDeliveries'),
        )
      })
      .finally(() => {
        if (!cancelled) {
          setDeliveryMapLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentCompany?.id, shouldRenderDeliveryMap])

  useEffect(() => {
    if (!isFocused || !currentCompany?.id) {
      return undefined
    }

    refreshOrders()
    return undefined
  }, [currentCompany?.id, isFocused, refreshOrders])

  useEffect(() => {
    if (!isFocused || !currentCompany?.id) {
      return undefined
    }

    const interval = setInterval(() => {
      refreshOrders()
    }, 30000)

    return () => clearInterval(interval)
  }, [currentCompany?.id, isFocused, refreshOrders])

  useEffect(() => {
    if (!sortedOrders.length) {
      return undefined
    }

    let cancelled = false

    Promise.all(
      sortedOrders.map(async order => {
        const orderId = normalizeEntityId(order?.id || order?.['@id'])
        if (!orderId) {
          return null
        }

        const detailedOrder = await loadDetailedOrder(orderId)
        if (!detailedOrder) {
          return null
        }

        return [String(orderId), detailedOrder]
      }),
    ).then(results => {
      if (cancelled) {
        return
      }

      setDetailedOrdersById(currentDetails => {
        const nextDetails = {
          ...currentDetails,
        }

        results.forEach(entry => {
          if (!entry) {
            return
          }

          const [orderId, detailedOrder] = entry
          nextDetails[orderId] = detailedOrder
        })

        return nextDetails
      })
    })

    return () => {
      cancelled = true
    }
  }, [sortedOrders])

  const showSkeleton =
    isInitialOrdersLoading &&
    sortedOrders.length === 0

  const renderOrderCard = useCallback(
    ({ item: order }) => {
      const orderId = normalizeEntityId(order)
      const detailedOrder = orderId ? detailedOrdersById[String(orderId)] || order : order
      const isLoadingDetails = Boolean(orderId) && !detailedOrdersById[String(orderId)]

      return (
        <TvOrderCard
          order={detailedOrder}
          ppcColors={ppcColors}
          styles={tvStyles}
          orderStyles={orderStyles}
          isLoadingDetails={isLoadingDetails}
        />
      )
    },
    [detailedOrdersById, orderStyles, ppcColors, tvStyles],
  )

  return (
    <View style={tvStyles.page}>
      {showSkeleton ? (
        <View style={tvStyles.loadingWrap}>
          <View style={tvStyles.loadingCard}>
            <ActivityIndicator size="large" color={ppcColors.accentInfo} />
            <Text style={tvStyles.loadingText}>Carregando pedidos...</Text>
          </View>
        </View>
      ) : sortedOrders.length > 0 ? (
        <FlatList
          data={sortedOrders}
          key={`tv-orders-cols-${columns}`}
          numColumns={columns}
          keyExtractor={item => String(item?.id || item?.['@id'])}
          renderItem={renderOrderCard}
          columnWrapperStyle={columns > 1 ? tvStyles.columnWrapper : null}
          contentContainerStyle={tvStyles.list}
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            loadingMore ? (
              <View style={tvStyles.loadingWrap}>
                <ActivityIndicator size="small" color={ppcColors.accentInfo} />
                <Text style={tvStyles.loadingText}>Carregando mais pedidos...</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      ) : shouldRenderDeliveryMap ? (
        <View style={tvStyles.tvMapStage}>
          <DisplayDeliveryMap
            payload={deliveryMapPayload}
            isLoading={deliveryMapLoading}
            error={deliveryMapError}
            ppcColors={ppcColors}
            tvMode
          />

          <OperationalInsightsDock
            filters={operationalInsightsFilters || null}
            ppcColors={ppcColors}
            periodLabel={global.t?.t('display', 'subtitle', 'today')}
          />
        </View>
      ) : (
        <View style={tvStyles.emptyWrap}>
          <View style={tvStyles.emptyCard}>
            <Text style={tvStyles.emptyText}>Nenhum pedido disponível.</Text>
            <Text style={tvStyles.emptyHint}>
              O monitor de TV mostra a lista completa de pedidos com seus detalhes.
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

export default TvDisplay
