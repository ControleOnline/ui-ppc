const normalizePayloadText = value => String(value || '').trim()

export const resolveDisplayDeliveryWebApiKey = payload =>
  normalizePayloadText(
    payload?.webGoogleMapsApiKey || payload?.googleMapsApiKey,
  )

export const resolveDisplayDeliveryAndroidWebViewApiKey = payload =>
  resolveDisplayDeliveryWebApiKey(payload) ||
  normalizePayloadText(payload?.androidGoogleMapsApiKey)
