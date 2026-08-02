/* global describe, expect, it */

import resolveResponsiveOrderColumns, {
  resolveResponsiveOrderViewportWidth,
} from '@controleonline/ui-ppc/src/react/pages/displays/orders/responsiveColumns'

describe('resolveResponsiveOrderColumns', () => {
  it('uses the actual window width when the browser viewport is narrower than the screen', () => {
    expect(resolveResponsiveOrderViewportWidth(420, 1366)).toBe(420)
  })

  it('falls back to the screen width when the window width is unavailable', () => {
    expect(resolveResponsiveOrderViewportWidth(0, 1366)).toBe(1366)
  })

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
