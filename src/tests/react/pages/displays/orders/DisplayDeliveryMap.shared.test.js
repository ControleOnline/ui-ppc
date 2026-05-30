const {
  resolveDisplayDeliveryAndroidWebViewApiKey,
  resolveDisplayDeliveryWebApiKey,
} = require('../../../../../react/pages/displays/orders/DisplayDeliveryMap.shared')

const {describe, expect, it} = global

describe('DisplayDeliveryMap.shared', () => {
  it('prefers the dedicated web key and falls back to the legacy payload key', () => {
    expect(
      resolveDisplayDeliveryWebApiKey({
        webGoogleMapsApiKey: 'web-key',
        googleMapsApiKey: 'legacy-key',
      }),
    ).toBe('web-key')

    expect(
      resolveDisplayDeliveryWebApiKey({
        googleMapsApiKey: 'legacy-key',
      }),
    ).toBe('legacy-key')
  })

  it('uses the web-compatible key first on Android WebView', () => {
    expect(
      resolveDisplayDeliveryAndroidWebViewApiKey({
        webGoogleMapsApiKey: 'web-key',
        androidGoogleMapsApiKey: 'android-key',
      }),
    ).toBe('web-key')

    expect(
      resolveDisplayDeliveryAndroidWebViewApiKey({
        googleMapsApiKey: 'legacy-key',
        androidGoogleMapsApiKey: 'android-key',
      }),
    ).toBe('legacy-key')

    expect(
      resolveDisplayDeliveryAndroidWebViewApiKey({
        androidGoogleMapsApiKey: 'android-key',
      }),
    ).toBe('android-key')
  })
})
