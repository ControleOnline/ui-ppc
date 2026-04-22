const {
  getOrderType,
  isDisplayVisibleOrder,
} = require('../../../../../react/pages/displays/orders/orderVisibility')
const { describe, expect, it } = global

describe('orderVisibility', () => {
  it('uses only the canonical orderType field', () => {
    expect(getOrderType({ orderType: 'sale' })).toBe('sale')
  })

  it('does not infer order type from alias fields', () => {
    expect(getOrderType({ order_type: 'sale' })).toBe('')
    expect(getOrderType({ type: 'sale' })).toBe('')
    expect(getOrderType({ order: { orderType: 'sale' } })).toBe('')
    expect(getOrderType({ order: { order_type: 'sale' } })).toBe('')
    expect(getOrderType({ order: { type: 'sale' } })).toBe('')
  })

  it('shows only open sale orders', () => {
    expect(
      isDisplayVisibleOrder({
        status: { realStatus: 'open' },
        orderType: 'sale',
      }),
    ).toBe(true)
  })

  it('hides orders when sale exists only in fallback fields', () => {
    expect(
      isDisplayVisibleOrder({
        status: { realStatus: 'open' },
        order_type: 'sale',
      }),
    ).toBe(false)

    expect(
      isDisplayVisibleOrder({
        status: { realStatus: 'open' },
        type: 'sale',
      }),
    ).toBe(false)

    expect(
      isDisplayVisibleOrder({
        status: { realStatus: 'open' },
        order: { orderType: 'sale' },
      }),
    ).toBe(false)
  })
})
