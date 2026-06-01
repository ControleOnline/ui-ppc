const {
  resolveOrdersTopCounterValue,
} = require('../../../../../react/pages/displays/orders/ordersTopCounter')

const { describe, expect, it } = global

describe('ordersTopCounter', () => {
  it('uses the API totalItems as the top counter value', () => {
    expect(resolveOrdersTopCounterValue(17)).toBe(17)
    expect(resolveOrdersTopCounterValue('17')).toBe(17)
  })

  it('falls back to zero only when the API value is invalid', () => {
    expect(resolveOrdersTopCounterValue(undefined)).toBe(0)
    expect(resolveOrdersTopCounterValue(null)).toBe(0)
    expect(resolveOrdersTopCounterValue('invalid')).toBe(0)
  })
})
