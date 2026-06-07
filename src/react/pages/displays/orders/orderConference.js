import {
  buildOrderProductCards,
  getOrderProductQueues,
  normalizeOrderProductQuantity,
  toOrderProductEntityId,
} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'

const CHECKED_STATUSES = new Set(['conferido', 'checked'])

export const parseConferenceEntityId = value => {
  if (!value) return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value.trim().replace(/^.*\//, '')
  return parseConferenceEntityId(value?.id || value?.['@id'] || value?.value)
}

export const normalizeScanCode = value => String(value || '').trim()

export const getHydraItems = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.member)) return value.member
  if (Array.isArray(value?.['hydra:member'])) return value['hydra:member']
  return []
}

export const normalizeConferenceOrderProducts = value => {
  if (Array.isArray(value)) return value
  return getHydraItems(value)
}

export const getOrderProductSku = orderProduct =>
  normalizeScanCode(
    orderProduct?.product?.sku ||
    orderProduct?.product?.SKU ||
    orderProduct?.product?.code ||
    orderProduct?.sku ||
    orderProduct?.SKU ||
    '',
  )

export const isOrderProductChecked = orderProduct => {
  const realStatus = String(orderProduct?.status?.realStatus || '').trim().toLowerCase()
  const status = String(orderProduct?.status?.status || '').trim().toLowerCase()

  return CHECKED_STATUSES.has(realStatus) || CHECKED_STATUSES.has(status)
}

export const getOrderProductStatusColor = (orderProduct, fallbackColor = '#334155') =>
  normalizeScanCode(orderProduct?.status?.color) || fallbackColor

const createConferenceTarget = ({
  card,
  entry = null,
  entryType = 'root',
  fallbackColor,
  orderProduct,
}) => {
  const orderProductId = parseConferenceEntityId(
    orderProduct?.id || orderProduct?.['@id'],
  )

  if (!orderProduct || !orderProductId) {
    return null
  }

  const queues = getOrderProductQueues(orderProduct)
  const queueIds = queues
    .map(queueItem => parseConferenceEntityId(queueItem?.id || queueItem?.['@id']))
    .filter(Boolean)
  const required = normalizeOrderProductQuantity(orderProduct?.quantity || entry?.quantity || card?.quantity)
  const sku = getOrderProductSku(orderProduct)

  return {
    card,
    entry,
    entryType,
    orderProduct,
    orderProductId,
    required,
    queueIds,
    scanKeys: queueIds.length ? queueIds : (sku ? [sku] : []),
    sku,
    statusColor: getOrderProductStatusColor(orderProduct, fallbackColor),
  }
}

const collectQueuedGroupTargets = ({ card, groups, fallbackColor, targets }) => {
  ;(Array.isArray(groups) ? groups : []).forEach(group => {
    ;(Array.isArray(group?.items) ? group.items : []).forEach(groupItem => {
      const orderProduct = groupItem?.orderProduct || null

      if (getOrderProductQueues(orderProduct).length > 0) {
        const target = createConferenceTarget({
          card,
          entry: groupItem,
          entryType: 'group',
          fallbackColor,
          orderProduct,
        })

        if (target) {
          targets.push(target)
        }
      }

      collectQueuedGroupTargets({
        card,
        groups: groupItem?.groups,
        fallbackColor,
        targets,
      })
    })
  })
}

export const buildConferenceTargets = (orderProducts, fallbackColor = '#334155') => {
  const cards = buildOrderProductCards(normalizeConferenceOrderProducts(orderProducts), {
    fallbackColor,
    resolveItemColor: item => getOrderProductStatusColor(item, fallbackColor),
  })

  return cards.reduce((targets, card) => {
    const rootTarget = createConferenceTarget({
      card,
      entryType: 'root',
      fallbackColor,
      orderProduct: card?.rootItem || null,
    })

    if (rootTarget) {
      targets.push(rootTarget)
    }

    collectQueuedGroupTargets({
      card,
      groups: card?.groups,
      fallbackColor,
      targets,
    })

    return targets
  }, [])
}

export const initializeConferenceState = targets => {
  const countsByOrderProductId = {}

  ;(Array.isArray(targets) ? targets : []).forEach(target => {
    countsByOrderProductId[target.orderProductId] = isOrderProductChecked(target.orderProduct)
      ? target.required
      : 0
  })

  return {
    countsByOrderProductId,
    scannedQueueIds: {},
  }
}

export const resolveConferenceProgress = (targets, state) => {
  const totals = (Array.isArray(targets) ? targets : []).reduce(
    (accumulator, target) => {
      const count = Number(state?.countsByOrderProductId?.[target.orderProductId] || 0)

      accumulator.checked += Math.min(Math.max(count, 0), target.required)
      accumulator.total += target.required

      return accumulator
    },
    { checked: 0, total: 0 },
  )

  return {
    ...totals,
    complete: totals.total > 0 && totals.checked >= totals.total,
  }
}

const cloneConferenceState = state => ({
  countsByOrderProductId: { ...(state?.countsByOrderProductId || {}) },
  scannedQueueIds: { ...(state?.scannedQueueIds || {}) },
})

export const getConferenceTargetProgress = (target, state) =>
  Math.min(
    Math.max(Number(state?.countsByOrderProductId?.[target?.orderProductId] || 0), 0),
    Number(target?.required || 0),
  )

export const applyConferenceScan = (targets, state, rawScanCode) => {
  const scanCode = normalizeScanCode(rawScanCode)
  const currentState = cloneConferenceState(state)

  if (!scanCode) {
    return { matched: false, completedNow: false, target: null, state: currentState }
  }

  const queueTarget = (Array.isArray(targets) ? targets : []).find(target =>
    target.queueIds.includes(scanCode),
  )

  if (queueTarget) {
    const previousCount = getConferenceTargetProgress(queueTarget, currentState)
    if (previousCount >= queueTarget.required) {
      return { matched: true, completedNow: false, target: queueTarget, state: currentState }
    }

    currentState.scannedQueueIds[scanCode] = Number(currentState.scannedQueueIds[scanCode] || 0) + 1
    currentState.countsByOrderProductId[queueTarget.orderProductId] = previousCount + 1

    return {
      matched: true,
      completedNow: previousCount + 1 >= queueTarget.required,
      target: queueTarget,
      state: currentState,
    }
  }

  const skuTarget = (Array.isArray(targets) ? targets : []).find(target =>
    !target.queueIds.length &&
    target.sku === scanCode &&
    getConferenceTargetProgress(target, currentState) < target.required,
  )

  if (!skuTarget) {
    return { matched: false, completedNow: false, target: null, state: currentState }
  }

  const previousCount = getConferenceTargetProgress(skuTarget, currentState)
  currentState.countsByOrderProductId[skuTarget.orderProductId] = previousCount + 1

  return {
    matched: true,
    completedNow: previousCount + 1 >= skuTarget.required,
    target: skuTarget,
    state: currentState,
  }
}

export const resolveOrderProductId = orderProduct =>
  parseConferenceEntityId(orderProduct?.id || orderProduct?.['@id'] || toOrderProductEntityId(orderProduct))
