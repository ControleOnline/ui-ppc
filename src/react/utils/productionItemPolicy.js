/**
 * Commercial-core T12 (ui-ppc#11): production vs conference vs fulfillment.
 *
 * - Tracking / conference (order-level): all confirmed OrderProducts, with or without queue.
 * - Station / queue view: only items that have OrderProductQueue for that station — never invent a synthetic queue.
 * - Items without OrderProductQueue are marked "sem etapa produtiva" (no production stage).
 * - `ready` ends production only; it is not served / picked up / delivered / fulfillment complete.
 */

const normalizeId = value => {
  if (value == null || value === '') return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value.trim().replace(/^.*\//, '')
  return normalizeId(value?.id || value?.['@id'] || value?.value)
}

/**
 * Extract OrderProductQueue entries from an OrderProduct (API may nest under several keys).
 */
export const getOrderProductQueueEntries = orderProduct => {
  if (!orderProduct || typeof orderProduct !== 'object') return []

  const raw =
    orderProduct.orderProductQueues ||
    orderProduct.order_product_queues ||
    orderProduct.orderProductQueue ||
    orderProduct.queues ||
    []

  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return [raw]
  return []
}

export const getOrderProductQueueIds = orderProduct =>
  getOrderProductQueueEntries(orderProduct)
    .map(entry => normalizeId(entry?.id || entry?.['@id'] || entry))
    .filter(Boolean)

/**
 * True when the OrderProduct has at least one production queue binding.
 */
export const hasProductionStage = orderProduct =>
  getOrderProductQueueIds(orderProduct).length > 0

/**
 * Label for items without a production queue (conference / tracking UI).
 */
export const NO_PRODUCTION_STAGE_LABEL = 'sem etapa produtiva'

/**
 * Station/queue-specific view: keep only items bound to one of the allowed queue ids.
 * Does not create synthetic queues for items without OrderProductQueue.
 */
export const filterOrderProductsForStationQueues = (orderProducts, allowedQueueIds) => {
  const allowed = new Set(
    (Array.isArray(allowedQueueIds) ? allowedQueueIds : [])
      .map(normalizeId)
      .filter(Boolean),
  )

  if (!allowed.size) return []

  return (Array.isArray(orderProducts) ? orderProducts : []).filter(op => {
    const ids = getOrderProductQueueIds(op)
    return ids.some(id => allowed.has(id))
  })
}

/**
 * Order-level tracking / conference: all confirmed root items (caller supplies the list).
 * Annotate each with production-stage metadata; never drop items solely for missing queue.
 */
export const annotateProductionStage = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : []).map(op => {
    const queueIds = getOrderProductQueueIds(op)
    const withStage = queueIds.length > 0

    return {
      orderProduct: op,
      hasProductionStage: withStage,
      queueIds,
      productionStageLabel: withStage ? null : NO_PRODUCTION_STAGE_LABEL,
    }
  })

/**
 * Partition annotated list into with-stage vs without-stage (for badges / sections).
 */
export const partitionByProductionStage = annotated => {
  const list = Array.isArray(annotated) ? annotated : []
  return {
    withProductionStage: list.filter(item => item.hasProductionStage),
    withoutProductionStage: list.filter(item => !item.hasProductionStage),
  }
}

/**
 * Production `ready` is not fulfillment. Explicit guard for UI/actions that must not
 * treat production completion as served/picked-up/delivered.
 */
export const isProductionReadyOnly = actionOrStatus => {
  const value = String(actionOrStatus || '')
    .trim()
    .toLowerCase()
  if (!value) return false

  const productionOnly = new Set([
    'ready',
    'pronto',
    'status_out',
    'production_ready',
    'prepared',
  ])

  const fulfillmentActions = new Set([
    'served',
    'servido',
    'picked_up',
    'retirado',
    'delivered',
    'entregue',
    'fulfillment',
    'fulfillment_complete',
  ])

  if (fulfillmentActions.has(value)) return false
  return productionOnly.has(value)
}

export default {
  getOrderProductQueueEntries,
  getOrderProductQueueIds,
  hasProductionStage,
  NO_PRODUCTION_STAGE_LABEL,
  filterOrderProductsForStationQueues,
  annotateProductionStage,
  partitionByProductionStage,
  isProductionReadyOnly,
}
