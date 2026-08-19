const {
  mergeOrderProduct,
  shouldWaitForCompletePayload,
  normalizeEntityId,
  getHydraCollection,
} = require('../../../react/utils/orderProductMerge')

describe('mergeOrderProduct (ui-ppc#4 identity)', () => {
  it('returns base when detailed is null/undefined/non-object', () => {
    const base = { id: 10, '@id': '/order_products/10', product: { name: 'Pizza' } }
    expect(mergeOrderProduct(base, null)).toBe(base)
    expect(mergeOrderProduct(base, undefined)).toBe(base)
    expect(mergeOrderProduct(base, 'x')).toBe(base)
  })

  it('never overwrites base id with detailed id', () => {
    const base = { id: 100, '@id': '/order_products/100', quantity: 1 }
    const detailed = { id: 999, '@id': '/order_products/999', quantity: 2, product: { name: 'Burger' } }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(100)
    expect(merged['@id']).toBe('/order_products/100')
    expect(merged.quantity).toBe(2)
    expect(merged.product.name).toBe('Burger')
  })

  it('keeps base id when detailed omits id', () => {
    const base = { id: 55, '@id': '/order_products/55' }
    const detailed = { product: { name: 'Salad' } }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(55)
    expect(merged['@id']).toBe('/order_products/55')
  })

  it('falls back to detailed id only when base has no id', () => {
    const base = { quantity: 1 }
    const detailed = { id: 77, '@id': '/order_products/77', quantity: 3 }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(77)
    expect(merged['@id']).toBe('/order_products/77')
  })

  it('merges nested product without losing base fields', () => {
    const base = {
      id: 1,
      product: { id: 9, name: 'Base name', sku: 'SKU-1' },
    }
    const detailed = {
      id: 999,
      product: { name: 'Detailed name', price: 12 },
    }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(1)
    expect(merged.product.id).toBe(9)
    expect(merged.product.name).toBe('Detailed name')
    expect(merged.product.sku).toBe('SKU-1')
    expect(merged.product.price).toBe(12)
  })

  it('prefers detailed orderProductComponents collection when present', () => {
    const base = {
      id: 2,
      orderProductComponents: [{ id: 11 }],
    }
    const detailed = {
      id: 888,
      orderProductComponents: [{ id: 21 }, { id: 22 }],
    }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(2)
    expect(merged.orderProductComponents).toEqual([{ id: 21 }, { id: 22 }])
    expect(merged.order_product_components).toEqual([{ id: 21 }, { id: 22 }])
  })

  it('accepts hydra:member collections', () => {
    const base = { id: 3 }
    const detailed = {
      id: 900,
      order_product_components: { 'hydra:member': [{ id: 31 }] },
    }
    const merged = mergeOrderProduct(base, detailed)
    expect(merged.id).toBe(3)
    expect(merged.orderProductComponents).toEqual([{ id: 31 }])
  })
})

describe('shouldWaitForCompletePayload (ui-ppc#4 incomplete tree guard)', () => {
  it('is true only when fetch required, loading, and no detailed metadata', () => {
    expect(shouldWaitForCompletePayload(true, true, false)).toBe(true)
  })

  it('is false when detailed metadata already present', () => {
    expect(shouldWaitForCompletePayload(true, true, true)).toBe(false)
  })

  it('is false when not loading', () => {
    expect(shouldWaitForCompletePayload(true, false, false)).toBe(false)
  })

  it('is false when fetch is not required', () => {
    expect(shouldWaitForCompletePayload(false, true, false)).toBe(false)
  })
})

describe('normalizeEntityId', () => {
  it('parses numeric, string, and IRI forms', () => {
    expect(normalizeEntityId(42)).toBe(42)
    expect(normalizeEntityId('42')).toBe(42)
    expect(normalizeEntityId('/order_products/42')).toBe(42)
    expect(normalizeEntityId({ id: 42 })).toBe(42)
    expect(normalizeEntityId({ '@id': '/order_products/42' })).toBe(42)
    expect(normalizeEntityId(null)).toBe(null)
  })
})

describe('getHydraCollection', () => {
  it('reads array, member and hydra:member', () => {
    expect(getHydraCollection([1, 2])).toEqual([1, 2])
    expect(getHydraCollection({ member: [3] })).toEqual([3])
    expect(getHydraCollection({ 'hydra:member': [4] })).toEqual([4])
    expect(getHydraCollection(null)).toBe(null)
  })
})
