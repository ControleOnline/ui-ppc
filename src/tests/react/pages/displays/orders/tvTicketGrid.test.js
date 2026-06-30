/* global describe, expect, it */

import {
  buildTvTicketGridSlots,
  resolveTvTicketGridColumns,
  resolveTvTicketGridSlotCount,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/tvTicketGrid'

describe('tv ticket grid', () => {
  it('keeps four fixed slots until the fourth order', () => {
    expect(resolveTvTicketGridSlotCount(0)).toBe(4)
    expect(resolveTvTicketGridSlotCount(1)).toBe(4)
    expect(resolveTvTicketGridSlotCount(4)).toBe(4)
  })

  it('expands to eight fixed slots from the fifth order', () => {
    expect(resolveTvTicketGridSlotCount(5)).toBe(8)
    expect(resolveTvTicketGridSlotCount(8)).toBe(8)
  })

  it('does not hide loaded orders above the eight visible positions', () => {
    expect(resolveTvTicketGridSlotCount(9)).toBe(9)
  })

  it('keeps tickets moving from left to right across four columns', () => {
    expect(resolveTvTicketGridColumns(4)).toBe(4)
    expect(resolveTvTicketGridColumns(8)).toBe(4)
  })

  it('keeps new orders at the beginning and fills empty positions', () => {
    const slots = buildTvTicketGridSlots([{id: 9}, {id: 8}, {id: 7}])

    expect(slots).toHaveLength(4)
    expect(slots.map(slot => slot.order?.id || null)).toEqual([9, 8, 7, null])
  })
})
