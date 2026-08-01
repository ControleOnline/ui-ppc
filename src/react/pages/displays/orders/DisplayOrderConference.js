import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'

import createStyles from './DisplayOrderConference.styles'
import {
  applyConferenceScan,
  buildConferencePresentationCards,
  buildConferenceTargets,
  getHydraItems,
  getOrderProductStatusColor,
  initializeConferenceState,
  normalizeConferenceOrderProducts,
  normalizeScanCode,
  parseConferenceEntityId,
  resolveConferenceProgress,
  resolveConferencePresentationProgress,
  resolveConferencePresentationTargets,
} from './orderConference'

const SCAN_IDLE_TIMEOUT_MS = 90
const SCAN_MIN_LENGTH = 3
const SCAN_MAX_TOTAL_MS = 700
const SCAN_MAX_AVERAGE_INTERVAL_MS = 70

const getFirstResponseMember = response => {
  const items = getHydraItems(response)
  if (items.length) return items[0]
  return response && typeof response === 'object' ? response : null
}

const formatApiError = error =>
  error?.message ||
  error?.description ||
  error?.errmsg ||
  global.t?.t('orders', 'message', 'unableCompleteOperation') ||
  'Nao foi possivel concluir a operacao.'

const getOrderProductsFromOrder = order =>
  normalizeConferenceOrderProducts(order?.orderProducts || order?.order_products)

const DisplayOrderConference = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const ordersStore = useStore('orders')
  const ordersActions = ordersStore.actions
  const { ppcColors } = useDisplayTheme()
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])

  const orderId = parseConferenceEntityId(route.params?.orderId || route.params?.id)

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conferenceState, setConferenceState] = useState(() =>
    initializeConferenceState([]),
  )
  const [manualCode, setManualCode] = useState('')
  const [readyLoading, setReadyLoading] = useState(false)
  const [persistingIds, setPersistingIds] = useState({})

  const bufferRef = useRef('')
  const startedAtRef = useRef(0)
  const lastInputAtRef = useRef(0)
  const finalizeTimeoutRef = useRef(null)
  const persistedCheckedIdsRef = useRef({})

  const orderProducts = useMemo(() => getOrderProductsFromOrder(order), [order])
  const targets = useMemo(
    () => buildConferenceTargets(orderProducts, order?.status?.color),
    [order?.status?.color, orderProducts],
  )
  const presentationCards = useMemo(
    () => buildConferencePresentationCards(orderProducts, order?.status?.color),
    [order?.status?.color, orderProducts],
  )
  const progress = useMemo(
    () => resolveConferenceProgress(targets, conferenceState),
    [conferenceState, targets],
  )

  const orderProductsStyles = useMemo(() => ({
    itemRow: styles.itemRow,
    itemMainRow: styles.itemMainRow,
    itemContent: styles.itemContent,
    text: styles.text,
    qtyText: styles.qtyText,
    statusMarker: styles.statusMarker,
    metaWrap: styles.metaWrap,
    subText: styles.subText,
    groupWrap: styles.groupWrap,
    groupTitlePill: styles.groupTitlePill,
    groupTitle: styles.groupTitle,
    groupItem: styles.groupItem,
    groupItemMainRow: styles.groupItemMainRow,
    groupItemContent: styles.groupItemContent,
    groupItemText: styles.groupItemText,
    groupItemMetaWrap: styles.groupItemMetaWrap,
    groupItemMetaText: styles.groupItemMetaText,
    itemActions: styles.itemActions,
    groupItemActions: styles.groupItemActions,
    queueBadge: styles.queueBadge,
    queueBadgeDot: styles.queueBadgeDotHidden,
    queueBadgeText: styles.queueBadgeText,
    rootFamilySeparator: styles.rootFamilySeparator,
  }), [styles])

  const reloadOrder = useCallback(async () => {
    if (!orderId) return null

    setLoading(true)
    try {
      const response = await api.fetch(`/orders/${orderId}/conference`)
      const loadedOrder = getFirstResponseMember(response)

      if (loadedOrder) {
        setOrder(loadedOrder)
        ordersActions.syncOrder?.(loadedOrder)
      }

      return loadedOrder
    } catch (error) {
      Alert.alert(
        global.t?.t('orders', 'title', 'error') || 'Erro',
        formatApiError(error),
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [orderId, ordersActions])

  useLayoutEffect(() => {
    navigation.setOptions({
      title: global.t?.t('orders', 'title', 'conference') || 'Conferencia',
      headerBackVisible: true,
    })
  }, [navigation])

  useEffect(() => {
    if (orderId) {
      void reloadOrder()
    }
  }, [orderId, reloadOrder])

  useEffect(() => {
    setConferenceState(current => {
      const next = initializeConferenceState(targets)
      const countsByOrderProductId = { ...next.countsByOrderProductId }

      Object.entries(current.countsByOrderProductId || {}).forEach(([targetId, count]) => {
        countsByOrderProductId[targetId] = Math.max(
          Number(countsByOrderProductId[targetId] || 0),
          Number(count || 0),
        )
      })

      return {
        countsByOrderProductId,
        scannedQueueIds: current.scannedQueueIds,
      }
    })
  }, [targets])

  const markOrderProductChecked = useCallback(async target => {
    const targetId = target?.orderProductId
    if (!targetId || persistedCheckedIdsRef.current[targetId]) return

    persistedCheckedIdsRef.current[targetId] = true
    setPersistingIds(current => ({ ...current, [targetId]: true }))

    try {
      await api.fetch(`/order_products/${targetId}/check`, { method: 'POST' })
      await reloadOrder()
    } catch (error) {
      delete persistedCheckedIdsRef.current[targetId]
      Alert.alert(
        global.t?.t('orders', 'title', 'error') || 'Erro',
        formatApiError(error),
      )
    } finally {
      setPersistingIds(current => {
        const next = { ...current }
        delete next[targetId]
        return next
      })
    }
  }, [reloadOrder])

  const handleScan = useCallback(rawScanCode => {
    const scanCode = normalizeScanCode(rawScanCode)
    if (!scanCode || !targets.length) return

    setConferenceState(currentState => {
      const result = applyConferenceScan(targets, currentState, scanCode)

      if (!result.matched) {
        Alert.alert(
          global.t?.t('orders', 'title', 'notFound') || 'Nao encontrado',
          `Codigo ${scanCode} nao pertence a este pedido.`,
        )
        return currentState
      }

      if (result.completedNow) {
        void markOrderProductChecked(result.target)
      }

      return result.state
    })
  }, [markOrderProductChecked, targets])

  const clearScanBuffer = useCallback(() => {
    bufferRef.current = ''
    startedAtRef.current = 0
    lastInputAtRef.current = 0
    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current)
      finalizeTimeoutRef.current = null
    }
  }, [])

  const finalizeBufferedScan = useCallback(() => {
    const scannedCode = normalizeScanCode(bufferRef.current)
    const startedAt = Number(startedAtRef.current || 0)
    const lastInputAt = Number(lastInputAtRef.current || 0)
    clearScanBuffer()

    if (!scannedCode || scannedCode.length < SCAN_MIN_LENGTH) return

    const totalDuration = Math.max(lastInputAt - startedAt, 0)
    const averageInterval =
      scannedCode.length > 1 ? totalDuration / (scannedCode.length - 1) : totalDuration
    const looksLikeScannerInput =
      totalDuration <= SCAN_MAX_TOTAL_MS ||
      averageInterval <= SCAN_MAX_AVERAGE_INTERVAL_MS

    if (looksLikeScannerInput) {
      handleScan(scannedCode)
    }
  }, [clearScanBuffer, handleScan])

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.addEventListener
    ) {
      clearScanBuffer()
      return undefined
    }

    const scheduleFinalize = () => {
      if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current)
      finalizeTimeoutRef.current = setTimeout(finalizeBufferedScan, SCAN_IDLE_TIMEOUT_MS)
    }

    const handleKeyDown = event => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const key = String(event.key || '')
      const now = Date.now()

      if (key === 'Enter') {
        if (bufferRef.current) {
          event.preventDefault()
          finalizeBufferedScan()
        }
        return
      }

      if (key.length !== 1) return

      if (lastInputAtRef.current && now - lastInputAtRef.current > SCAN_IDLE_TIMEOUT_MS) {
        clearScanBuffer()
      }

      if (!startedAtRef.current) {
        startedAtRef.current = now
      }

      bufferRef.current += key
      lastInputAtRef.current = now
      scheduleFinalize()
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      clearScanBuffer()
    }
  }, [clearScanBuffer, finalizeBufferedScan])

  const handleManualSubmit = useCallback(() => {
    const code = normalizeScanCode(manualCode)
    setManualCode('')
    handleScan(code)
  }, [handleScan, manualCode])

  const handleReady = useCallback(async () => {
    if (!orderId || !progress.complete || readyLoading) return

    setReadyLoading(true)
    try {
      await api.fetch(`/orders/${orderId}/ready`, { method: 'POST' })
      navigation.goBack()
    } catch (error) {
      Alert.alert(
        global.t?.t('orders', 'title', 'error') || 'Erro',
        formatApiError(error),
      )
    } finally {
      setReadyLoading(false)
    }
  }, [navigation, orderId, progress.complete, readyLoading])

  const renderConferenceAction = useCallback(({ card, entry, entryType }) => {
    const presentationTargets = resolveConferencePresentationTargets(
      { card, entry, entryType },
      targets,
    )
    if (!presentationTargets.length) return null

    const itemProgress = resolveConferencePresentationProgress(
      presentationTargets,
      conferenceState,
    )
    const persisting = presentationTargets.some(target =>
      Boolean(persistingIds[target.orderProductId]),
    )

    return (
      <View style={[styles.progressPill, itemProgress.complete && styles.progressPillComplete]}>
        {persisting ? (
          <ActivityIndicator size="small" color={itemProgress.complete ? '#16A34A' : ppcColors.accentInfo} />
        ) : (
          <Text
            style={[
              styles.progressPillText,
              itemProgress.complete && styles.progressPillTextComplete,
            ]}
          >
            {`${itemProgress.checked}/${itemProgress.total}`}
          </Text>
        )}
      </View>
    )
  }, [conferenceState, persistingIds, ppcColors.accentInfo, styles, targets])

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ppcColors.accentInfo} />
          <Text style={styles.loadingText}>Carregando pedido...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <OrderHeader
            order={order}
            isKds
            showPricing={false}
            showWaitingTime={false}
            metaText={order?.client?.name || ''}
          />
        </View>

        <View style={styles.productsCard}>
          {targets.length ? (
            <OrderProducts
              order={order}
              orderProducts={orderProducts}
              productCards={presentationCards}
              styles={orderProductsStyles}
              showDetails
              showDescriptions={false}
              showPricing={false}
              showHierarchyGuides
              showRootStatusMarker={false}
              showGroupStatusMarker={false}
              hierarchyGuideColor={ppcColors.border}
              compact
              renderActions={renderConferenceAction}
              resolveItemColor={getOrderProductStatusColor}
            />
          ) : (
            <Text style={styles.emptyText}>Nenhum item conferivel neste pedido.</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <View>
            <Text style={styles.footerLabel}>Conferencia</Text>
            <Text style={styles.footerCounter}>{`${progress.checked}/${progress.total}`}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={ppcColors.accentInfo} /> : null}
        </View>

        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={handleManualSubmit}
          placeholder="Bipe ou digite o codigo"
          placeholderTextColor={ppcColors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.scanInput}
        />

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={!progress.complete || readyLoading}
          onPress={handleReady}
          style={[
            styles.readyButton,
            (!progress.complete || readyLoading) && styles.readyButtonDisabled,
          ]}
        >
          {readyLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.readyButtonText}>
              {global.t?.t('orders', 'button', 'orderReady') || 'Pedido pronto'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default DisplayOrderConference
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
