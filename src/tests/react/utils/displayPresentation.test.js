import {
  normalizeQueueIdentificationMode,
  normalizeStatusIndicatorMode,
  resolveDisplayPresentation,
} from '../../../react/utils/displayPresentation'

describe('displayPresentation', () => {
  it('uses the completely compact presentation by default', () => {
    expect(resolveDisplayPresentation({})).toEqual({
      queueIdentificationMode: 'short_label',
      statusIndicatorMode: 'bullet',
      showUnitQuantity: false,
      showGroupNames: false,
    })
  })

  it('preserves valid display choices and normalizes invalid values', () => {
    expect(resolveDisplayPresentation({
      queueIdentificationMode: 'icon',
      statusIndicatorMode: 'line',
      showUnitQuantity: true,
      showGroupNames: true,
    })).toEqual({
      queueIdentificationMode: 'icon',
      statusIndicatorMode: 'line',
      showUnitQuantity: true,
      showGroupNames: true,
    })

    expect(normalizeQueueIdentificationMode('unknown')).toBe('short_label')
    expect(normalizeStatusIndicatorMode('unknown')).toBe('bullet')
  })
})
