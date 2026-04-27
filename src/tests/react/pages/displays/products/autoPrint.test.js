const {
  appendPendingAutoPrintJob,
  isDisplayAutoPrintEnabled,
  normalizeAutoPrintQueueItemId,
  removePendingAutoPrintJob,
  shouldAutoPrintTransition,
} = require('../../../../../react/pages/displays/products/autoPrint')

const { describe, expect, it } = global

describe('display product auto print', () => {
  it('normalizes queue item ids from raw values and entities', () => {
    expect(normalizeAutoPrintQueueItemId('/order_product_queues/15')).toBe('15')
    expect(normalizeAutoPrintQueueItemId({ '@id': '/order_product_queues/27' })).toBe('27')
    expect(normalizeAutoPrintQueueItemId({ id: 39 })).toBe('39')
  })

  it('queues each order-product queue only once', () => {
    expect(
      appendPendingAutoPrintJob(['12'], { '@id': '/order_product_queues/12' }),
    ).toEqual(['12'])

    expect(
      appendPendingAutoPrintJob(['12'], { '@id': '/order_product_queues/18' }),
    ).toEqual(['12', '18'])
  })

  it('removes only the settled print job from the pending queue', () => {
    expect(
      removePendingAutoPrintJob(['12', '18', '21'], '/order_product_queues/18'),
    ).toEqual(['12', '21'])
  })

  it('auto prints only on the in to working transition when enabled', () => {
    expect(
      shouldAutoPrintTransition({
        autoPrintEnabled: true,
        fromStage: 'status_in',
        toStage: 'status_working',
      }),
    ).toBe(true)

    expect(
      shouldAutoPrintTransition({
        autoPrintEnabled: false,
        fromStage: 'status_in',
        toStage: 'status_working',
      }),
    ).toBe(false)

    expect(
      shouldAutoPrintTransition({
        autoPrintEnabled: true,
        fromStage: 'status_working',
        toStage: 'status_out',
      }),
    ).toBe(false)
  })

  it('reads the display auto print flag from device configs', () => {
    expect(
      isDisplayAutoPrintEnabled({
        configs: JSON.stringify({
          'display-auto-print-product': '1',
        }),
      }),
    ).toBe(true)

    expect(
      isDisplayAutoPrintEnabled({
        configs: {
          'display-auto-print-product': '0',
        },
      }),
    ).toBe(false)
  })
})
