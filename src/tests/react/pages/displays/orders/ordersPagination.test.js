/* global describe, expect, it */

import {
  DISPLAY_ORDERS_PAGE_SIZE,
  extractCollectionItems,
  flattenOrdersPages,
  getNextOrdersPageNumber,
  hasMoreOrdersPages,
  mergeOrdersPage,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/ordersPagination'

describe('ordersPagination', () => {
  it('flattens loaded pages in order and skips duplicates', () => {
    const pages = mergeOrdersPage(
      mergeOrdersPage({}, 1, [{ id: '/orders/10' }, { id: '/orders/11' }]),
      2,
      [{ id: '/orders/11' }, { id: '/orders/12' }],
    )

    expect(flattenOrdersPages(pages).map(order => order.id)).toEqual([
      '/orders/10',
      '/orders/11',
      '/orders/12',
    ])
  })

  it('reads hydra collection payloads and resolves the next page number', () => {
    const items = extractCollectionItems({ 'hydra:member': [{ id: 1 }, { id: 2 }] })

    expect(items).toHaveLength(2)
    expect(getNextOrdersPageNumber({ 1: items, 2: [{ id: 3 }] })).toBe(3)
  })

  it('detects remaining pages from totalItems or a full last page', () => {
    const fullPages = {
      1: Array.from({ length: DISPLAY_ORDERS_PAGE_SIZE }, (_, index) => ({
        id: `/orders/${index + 1}`,
      })),
    }

    expect(hasMoreOrdersPages(fullPages, DISPLAY_ORDERS_PAGE_SIZE)).toBe(false)
    expect(hasMoreOrdersPages(fullPages, 12)).toBe(true)
    expect(hasMoreOrdersPages({ 1: [{ id: '/orders/1' }, { id: '/orders/2' }] }, 0)).toBe(false)
  })
})
