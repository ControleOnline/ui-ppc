/* global describe, expect, it */

import resolveResponsiveOrderColumns from '@controleonline/ui-ppc/src/react/pages/displays/orders/responsiveColumns'

describe('resolveResponsiveOrderColumns', () => {
  it('keeps a single column on the narrow tv viewport from the screenshot', () => {
    expect(resolveResponsiveOrderColumns(734)).toBe(1)
  })

  it('moves to two columns only after the wider responsive threshold', () => {
    expect(resolveResponsiveOrderColumns(900)).toBe(2)
  })

  it('preserves denser layouts on large screens', () => {
    expect(resolveResponsiveOrderColumns(1920)).toBe(5)
    expect(resolveResponsiveOrderColumns(2400)).toBe(6)
  })
})
