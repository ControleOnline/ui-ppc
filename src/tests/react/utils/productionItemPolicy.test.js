import {
  annotateProductionStage,
  filterOrderProductsForStationQueues,
  getOrderProductQueueIds,
  hasProductionStage,
  isProductionReadyOnly,
  NO_PRODUCTION_STAGE_LABEL,
  partitionByProductionStage,
} from '../../../react/utils/productionItemPolicy'

describe('productionItemPolicy (ui-ppc#11)', () => {
  const withQueue = {
    id: '/order_products/1',
    quantity: 1,
    orderProductQueues: [{ id: '/order_product_queues/10' }],
  }
  const withoutQueue = {
    id: '/order_products/2',
    quantity: 1,
    sku: 'SKU-NO-QUEUE',
  }
  const multiQueue = {
    id: 3,
    order_product_queues: [{ id: 20 }, { '@id': '/order_product_queues/21' }],
  }

  it('detects production stage from orderProductQueues', () => {
    expect(hasProductionStage(withQueue)).toBe(true)
    expect(hasProductionStage(withoutQueue)).toBe(false)
    expect(getOrderProductQueueIds(multiQueue)).toEqual(['20', '21'])
  })

  it('annotates items without dropping those without queue', () => {
    const annotated = annotateProductionStage([withQueue, withoutQueue])
    expect(annotated).toHaveLength(2)
    expect(annotated[0].hasProductionStage).toBe(true)
    expect(annotated[0].productionStageLabel).toBeNull()
    expect(annotated[1].hasProductionStage).toBe(false)
    expect(annotated[1].productionStageLabel).toBe(NO_PRODUCTION_STAGE_LABEL)

    const parts = partitionByProductionStage(annotated)
    expect(parts.withProductionStage).toHaveLength(1)
    expect(parts.withoutProductionStage).toHaveLength(1)
  })

  it('filters station view by allowed queues and never invents synthetic queues', () => {
    const onlyStation10 = filterOrderProductsForStationQueues(
      [withQueue, withoutQueue, multiQueue],
      ['10'],
    )
    expect(onlyStation10).toEqual([withQueue])

    const emptyAllowed = filterOrderProductsForStationQueues(
      [withQueue, withoutQueue],
      [],
    )
    expect(emptyAllowed).toEqual([])

    const station20 = filterOrderProductsForStationQueues(
      [withQueue, withoutQueue, multiQueue],
      [20],
    )
    expect(station20).toEqual([multiQueue])
  })

  it('treats ready as production-only, not fulfillment', () => {
    expect(isProductionReadyOnly('ready')).toBe(true)
    expect(isProductionReadyOnly('Pronto')).toBe(true)
    expect(isProductionReadyOnly('status_out')).toBe(true)
    expect(isProductionReadyOnly('served')).toBe(false)
    expect(isProductionReadyOnly('delivered')).toBe(false)
    expect(isProductionReadyOnly('fulfillment_complete')).toBe(false)
  })
})
