const {
  applyConferenceScan,
  buildConferenceTargets,
  initializeConferenceState,
  resolveConferenceProgress,
} = require('../../../../../react/pages/displays/orders/orderConference')

const createProduct = overrides => ({
  id: overrides.id,
  quantity: overrides.quantity || 1,
  product: {
    id: overrides.productId || `/products/${overrides.id}`,
    product: overrides.name || `Produto ${overrides.id}`,
    sku: overrides.sku || '',
  },
  status: overrides.status || { status: 'open', color: '#64748B' },
  ...(overrides.orderProductQueues ? { orderProductQueues: overrides.orderProductQueues } : {}),
  ...(overrides.productGroup ? { productGroup: overrides.productGroup } : {}),
})

describe('orderConference', () => {
  it('matches scans by order_product_queue id', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 10,
        orderProductQueues: [{ id: '/order_product_queues/987' }],
      }),
    ])
    const state = initializeConferenceState(targets)

    const result = applyConferenceScan(targets, state, '987')

    expect(result.matched).toBe(true)
    expect(result.completedNow).toBe(true)
    expect(resolveConferenceProgress(targets, result.state)).toEqual({
      checked: 1,
      total: 1,
      complete: true,
    })
  })

  it('falls back to SKU when the product has no queue', () => {
    const targets = buildConferenceTargets([
      createProduct({ id: 11, sku: 'SKU-SEM-FILA' }),
    ])
    const state = initializeConferenceState(targets)

    const result = applyConferenceScan(targets, state, 'SKU-SEM-FILA')

    expect(result.matched).toBe(true)
    expect(resolveConferenceProgress(targets, result.state).checked).toBe(1)
  })

  it('requires two scans when quantity is 2', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 12,
        quantity: 2,
        orderProductQueues: [{ id: 555 }],
      }),
    ])
    const state = initializeConferenceState(targets)

    const firstScan = applyConferenceScan(targets, state, '555')
    const secondScan = applyConferenceScan(targets, firstScan.state, '555')

    expect(firstScan.completedNow).toBe(false)
    expect(resolveConferenceProgress(targets, firstScan.state)).toMatchObject({
      checked: 1,
      total: 2,
      complete: false,
    })
    expect(secondScan.completedNow).toBe(true)
    expect(resolveConferenceProgress(targets, secondScan.state)).toMatchObject({
      checked: 2,
      total: 2,
      complete: true,
    })
  })

  it('counts already checked items in the initial progress', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 13,
        quantity: 2,
        sku: 'CHECKED',
        status: { status: 'conferido', color: '#16A34A' },
      }),
    ])
    const state = initializeConferenceState(targets)

    expect(resolveConferenceProgress(targets, state)).toEqual({
      checked: 2,
      total: 2,
      complete: true,
    })
  })

  it('does not change progress for an invalid scan', () => {
    const targets = buildConferenceTargets([
      createProduct({ id: 14, sku: 'VALIDO' }),
    ])
    const state = initializeConferenceState(targets)

    const result = applyConferenceScan(targets, state, 'INVALIDO')

    expect(result.matched).toBe(false)
    expect(resolveConferenceProgress(targets, result.state)).toEqual({
      checked: 0,
      total: 1,
      complete: false,
    })
  })

  it('does not expose productGroup parent children as root conference targets', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 15,
        productId: '/products/100',
        name: 'Batata Frita',
        sku: 'BATATA',
      }),
      createProduct({
        id: 16,
        productId: '/products/200',
        name: 'Paprica',
        sku: 'PAPRICA',
        productGroup: {
          parentProduct: '/products/100',
        },
      }),
    ])

    expect(targets).toHaveLength(1)
    expect(targets[0].sku).toBe('BATATA')
  })

  it('uses productGroup parentProducts to keep children inside parents and out of progress without queues', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 17,
        productId: '/products/300',
        name: 'Alpha Produto Exemplo',
        sku: 'ALPHA',
      }),
      createProduct({
        id: 18,
        productId: '/products/301',
        name: 'Cheddar',
        sku: 'CHEDDAR',
        productGroup: {
          parentProducts: [
            {
              parentProduct: '/products/300',
            },
          ],
        },
      }),
      createProduct({
        id: 19,
        productId: '/products/400',
        name: 'Beta Produto Exemplo',
        sku: 'BETA',
      }),
      createProduct({
        id: 20,
        productId: '/products/401',
        name: 'Catupiry',
        sku: 'CATUPIRY',
        productGroup: {
          parentProducts: [
            {
              parentProduct: '/products/400',
            },
          ],
        },
      }),
    ])

    expect(targets.map(target => target.sku)).toEqual(['ALPHA', 'BETA'])
    expect(resolveConferenceProgress(targets, initializeConferenceState(targets))).toEqual({
      checked: 0,
      total: 2,
      complete: false,
    })
  })

  it('counts grouped children only when they have queues', () => {
    const targets = buildConferenceTargets([
      createProduct({
        id: 21,
        productId: '/products/500',
        name: 'Combo',
        sku: 'COMBO',
      }),
      createProduct({
        id: 22,
        productId: '/products/501',
        name: 'Item com fila',
        sku: 'FILHO',
        orderProductQueues: [{ id: 778 }],
        productGroup: {
          parentProducts: [
            {
              parentProduct: '/products/500',
            },
          ],
        },
      }),
    ])
    const state = initializeConferenceState(targets)
    const result = applyConferenceScan(targets, state, '778')

    expect(targets.map(target => target.sku)).toEqual(['COMBO', 'FILHO'])
    expect(resolveConferenceProgress(targets, result.state)).toMatchObject({
      checked: 1,
      total: 2,
      complete: false,
    })
  })
})
