import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'

import createStyles from './DisplayDeliveryMap.styles'

const GOOGLE_MAPS_SCRIPT_ID = 'display-delivery-google-maps-api-script'
const GOOGLE_MAPS_CALLBACK_NAME = '__displayDeliveryGoogleMapsApiReady__'
const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 15000
const GOOGLE_MAPS_POLL_INTERVAL_MS = 100
const DELIVERY_POPUP_ROTATION_MS = 10000

const normalizeText = value => String(value || '').trim()

const escapeHtml = value =>
  normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const parseCoordinate = value => {
  const coordinate = Number(value)
  return Number.isFinite(coordinate) && coordinate !== 0 ? coordinate : null
}

const getStatusKey = delivery =>
  normalizeText(delivery?.status?.status || delivery?.status).toLowerCase()

const getStatusLabel = delivery => {
  const status = getStatusKey(delivery)
  if (status === 'closed') return 'Finalizado'
  if (status === 'way' || status === 'away') return 'Em entrega'
  return normalizeText(delivery?.status?.status || delivery?.status || 'Entrega')
}

const getStatusColor = delivery => {
  const status = getStatusKey(delivery)
  if (status === 'closed') return '#16A34A'
  if (status === 'way' || status === 'away') return '#0EA5E9'
  return normalizeText(delivery?.status?.color) || '#F59E0B'
}

const getRouteColor = delivery => {
  const status = getStatusKey(delivery)
  if (status === 'closed') return '#15803D'
  if (status === 'way' || status === 'away') return '#0369A1'
  return getStatusColor(delivery)
}

const getDeliveryTitle = delivery => {
  const displayCode = normalizeText(delivery?.displayCode)
  const id = normalizeText(delivery?.id)
  return displayCode ? `#${displayCode}` : id ? `#${id}` : 'Entrega'
}

const getAddressText = address => {
  if (!address) return ''
  if (typeof address === 'string') return normalizeText(address)

  return normalizeText(address.formatted || address.streetLine)
}

const getDeliveryAddressText = delivery =>
  getAddressText(delivery?.address)

const getProviderAddressText = payload => getAddressText(payload?.provider?.address)

const getPositionFromAddressPayload = address => {
  const latitude = parseCoordinate(
    address?.latitude,
  )
  const longitude = parseCoordinate(
    address?.longitude,
  )

  if (latitude === null || longitude === null) {
    return null
  }

  return { lat: latitude, lng: longitude }
}

const getDeliveryPositionFromPayload = delivery =>
  getPositionFromAddressPayload(delivery?.address) ||
  getPositionFromAddressPayload(delivery)

const getProviderPositionFromPayload = payload =>
  getPositionFromAddressPayload(payload?.provider?.address)

const svgToDataUrl = svg =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

const buildPinIcon = (google, color) => ({
  url: svgToDataUrl(`
    <svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity=".35"/>
        </filter>
      </defs>
      <path filter="url(#shadow)" d="M24 3C13.5 3 6 10.7 6 21.4C6 35.9 24 56 24 56S42 35.9 42 21.4C42 10.7 34.5 3 24 3Z" fill="${escapeHtml(color)}" stroke="#FFFFFF" stroke-width="4"/>
      <circle cx="24" cy="21" r="11" fill="#0F172A" fill-opacity=".20"/>
    </svg>
  `),
  scaledSize: new google.maps.Size(48, 60),
  anchor: new google.maps.Point(24, 56),
  labelOrigin: new google.maps.Point(24, 22),
})

const buildStoreIcon = google => ({
  url: svgToDataUrl(`
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-35%" y="-25%" width="170%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity=".34"/>
        </filter>
      </defs>
      <circle filter="url(#shadow)" cx="30" cy="30" r="24" fill="#111827" stroke="#FFFFFF" stroke-width="4"/>
      <path d="M18 30H42V43H18V30Z" fill="#FFFFFF"/>
      <path d="M16 28L30 17L44 28H16Z" fill="#FBBF24"/>
      <path d="M25 34H35V43H25V34Z" fill="#111827"/>
    </svg>
  `),
  scaledSize: new google.maps.Size(60, 60),
  anchor: new google.maps.Point(30, 30),
  labelOrigin: new google.maps.Point(30, 52),
})

const loadGoogleMapsApi = apiKey => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (window.__displayDeliveryGoogleMapsPromise) {
    return window.__displayDeliveryGoogleMapsPromise
  }

  const loadPromise = new Promise((resolve, reject) => {
    let settled = false
    let pollTimer = null
    let timeoutTimer = null

    const cleanup = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }

      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer)
        timeoutTimer = null
      }
    }

    const resolveMaps = () => {
      if (settled || !window.google?.maps) {
        return false
      }

      settled = true
      cleanup()
      resolve(window.google.maps)
      return true
    }

    const rejectMaps = error => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(error)
    }

    const startWatching = () => {
      if (settled || pollTimer || timeoutTimer) {
        return
      }

      pollTimer = window.setInterval(() => {
        resolveMaps()
      }, GOOGLE_MAPS_POLL_INTERVAL_MS)

      timeoutTimer = window.setTimeout(() => {
        rejectMaps(new Error('google-maps-load-failed'))
      }, GOOGLE_MAPS_LOAD_TIMEOUT_MS)
    }

    const handleLoad = () => {
      if (resolveMaps()) {
        return
      }

      startWatching()
    }

    const handleError = () => {
      rejectMaps(new Error('google-maps-load-failed'))
    }

    window[GOOGLE_MAPS_CALLBACK_NAME] = handleLoad

    const existingDisplayScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existingDisplayScript) {
      existingDisplayScript.addEventListener('load', handleLoad, { once: true })
      existingDisplayScript.addEventListener('error', handleError, { once: true })
      startWatching()
      return
    }

    const existingMapsScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    )
    if (existingMapsScript) {
      existingMapsScript.addEventListener('load', handleLoad, { once: true })
      existingMapsScript.addEventListener('error', handleError, { once: true })
      startWatching()
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=${GOOGLE_MAPS_CALLBACK_NAME}`
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
    startWatching()
  })

  window.__displayDeliveryGoogleMapsPromise = loadPromise.catch(error => {
    window.__displayDeliveryGoogleMapsPromise = null
    throw error
  })

  return window.__displayDeliveryGoogleMapsPromise
}

const geocodeAddress = (geocoder, address) =>
  new Promise(resolve => {
    if (!address) {
      resolve(null)
      return
    }

    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        resolve(null)
        return
      }

      const location = results[0].geometry.location
      resolve({
        lat: location.lat(),
        lng: location.lng(),
      })
    })
  })

const resolveDeliveryPosition = async ({ delivery, geocoder }) => {
  const payloadPosition = getDeliveryPositionFromPayload(delivery)
  if (payloadPosition) return payloadPosition

  return geocodeAddress(geocoder, getDeliveryAddressText(delivery))
}

const resolveProviderPosition = async ({ payload, geocoder }) => {
  const payloadPosition = getProviderPositionFromPayload(payload)
  if (payloadPosition) return payloadPosition

  return geocodeAddress(geocoder, getProviderAddressText(payload))
}

const injectPopupStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('display-delivery-map-popup-styles')) return

  const styleElement = document.createElement('style')
  styleElement.id = 'display-delivery-map-popup-styles'
  styleElement.textContent = `
    .display-delivery-popup {
      min-width: 220px;
      max-width: 300px;
      color: #0f172a;
      font-family: Arial, sans-serif;
    }
    .display-delivery-popup-title {
      font-size: 17px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .display-delivery-popup-status {
      display: inline-flex;
      border-radius: 999px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 5px 9px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .display-delivery-popup-line {
      font-size: 13px;
      line-height: 1.45;
      margin-bottom: 4px;
    }
    .display-delivery-popup-muted {
      color: #64748b;
      font-size: 12px;
      margin-top: 8px;
    }
  `
  document.head.appendChild(styleElement)
}

const buildPopupContent = delivery => {
  const statusColor = getStatusColor(delivery)
  const clientName = normalizeText(delivery?.client?.alias || delivery?.client?.name)
  const addressText = getDeliveryAddressText(delivery)

  return `
    <div class="display-delivery-popup">
      <div class="display-delivery-popup-title">${escapeHtml(getDeliveryTitle(delivery))}</div>
      <div class="display-delivery-popup-status" style="background:${escapeHtml(statusColor)}">
        ${escapeHtml(getStatusLabel(delivery))}
      </div>
      ${clientName ? `<div class="display-delivery-popup-line">${escapeHtml(clientName)}</div>` : ''}
      ${addressText ? `<div class="display-delivery-popup-line">${escapeHtml(addressText)}</div>` : ''}
      <div class="display-delivery-popup-muted">Status: ${escapeHtml(getStatusKey(delivery))}</div>
    </div>
  `
}

const buildStorePopupContent = payload => {
  const providerName = normalizeText(payload?.provider?.alias || payload?.provider?.name || 'Loja')
  const addressText = getProviderAddressText(payload)

  return `
    <div class="display-delivery-popup">
      <div class="display-delivery-popup-title">${escapeHtml(providerName)}</div>
      <div class="display-delivery-popup-status" style="background:#111827">Loja</div>
      ${addressText ? `<div class="display-delivery-popup-line">${escapeHtml(addressText)}</div>` : ''}
    </div>
  `
}

const drawRouteLine = ({ google, map, originPosition, destinationPosition, delivery }) => {
  const color = getRouteColor(delivery)

  return new google.maps.Polyline({
    path: [originPosition, destinationPosition],
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0.72,
    strokeWeight: 4,
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3.2,
          strokeColor: color,
          fillColor: color,
          fillOpacity: 1,
        },
        offset: '55%',
        repeat: '140px',
      },
    ],
    map,
  })
}

const DisplayDeliveryMap = ({
  payload = null,
  isLoading = false,
  error = '',
  ppcColors = {},
  tvMode = false,
}) => {
  const containerRef = useRef(null)
  const [mapState, setMapState] = useState('idle')
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const apiKey = normalizeText(payload?.googleMapsApiKey)
  const deliveries = useMemo(
    () => (Array.isArray(payload?.deliveries) ? payload.deliveries : []),
    [payload?.deliveries],
  )
  const enabled = Boolean(payload?.enabled && apiKey)

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined

    const container = containerRef.current
    if (!container || !enabled || deliveries.length === 0) {
      setMapState('idle')
      return undefined
    }

    let cancelled = false
    let popupRotationTimer = null
    let initRetryTimer = null
    let initRetryCount = 0

    const clearInitRetryTimer = () => {
      if (initRetryTimer) {
        window.clearTimeout(initRetryTimer)
        initRetryTimer = null
      }
    }

    const initializeMap = async () => {
      try {
        if (cancelled || !window.google?.maps) {
          return
        }

        await new Promise(resolve => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve)
          })
        })

        if (cancelled || !window.google?.maps) {
          return
        }

        const google = window.google
        const geocoder = new google.maps.Geocoder()
        const map = new google.maps.Map(container, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          zoomControl: true,
        })
        const infoWindow = new google.maps.InfoWindow({ maxWidth: 340 })
        const bounds = new google.maps.LatLngBounds()
        const deliveryMarkerEntries = []
        let markerCount = 0
        const originPosition = await resolveProviderPosition({ payload, geocoder })

        const markerEntries = await Promise.all(
          deliveries.map(async delivery => ({
            delivery,
            position: await resolveDeliveryPosition({ delivery, geocoder }),
          })),
        )

        if (cancelled) return

        if (originPosition) {
          bounds.extend(originPosition)

          const storeMarker = new google.maps.Marker({
            position: originPosition,
            map,
            title: 'Loja',
            zIndex: 1000,
            icon: buildStoreIcon(google),
          })

          storeMarker.addListener('click', () => {
            infoWindow.setContent(buildStorePopupContent(payload))
            infoWindow.open({
              anchor: storeMarker,
              map,
              shouldFocus: false,
            })
          })
        }

        markerEntries.forEach(({ delivery, position }) => {
          if (!position) return

          markerCount += 1
          const markerLabel = String(markerCount)
          bounds.extend(position)

          if (originPosition) {
            drawRouteLine({
              google,
              map,
              originPosition,
              destinationPosition: position,
              delivery,
            })
          }

          const marker = new google.maps.Marker({
            position,
            map,
            title: getDeliveryTitle(delivery),
            animation: google.maps.Animation.DROP,
            zIndex: 100 + markerCount,
            icon: buildPinIcon(google, getStatusColor(delivery)),
            label: {
              text: markerLabel,
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '900',
            },
          })

          marker.addListener('click', () => {
            infoWindow.setContent(buildPopupContent(delivery))
            infoWindow.open({
              anchor: marker,
              map,
              shouldFocus: false,
            })
          })

          deliveryMarkerEntries.push({ delivery, marker })
        })

        if (markerCount === 0) {
          setMapState('empty')
          return
        }

        map.fitBounds(bounds, {
          top: 56,
          right: 56,
          bottom: 56,
          left: 56,
        })

        const openDeliveryPopup = index => {
          const entry = deliveryMarkerEntries[index % deliveryMarkerEntries.length]
          if (!entry || cancelled) return

          infoWindow.setContent(buildPopupContent(entry.delivery))
          infoWindow.open({
            anchor: entry.marker,
            map,
            shouldFocus: false,
          })
          map.panTo(entry.marker.getPosition())
        }

        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (cancelled) return

          if (markerCount === 1 && map.getZoom() > 15) {
            map.setZoom(15)
          }

          let nextPopupIndex = 0
          openDeliveryPopup(nextPopupIndex)
          nextPopupIndex += 1

          popupRotationTimer = window.setInterval(() => {
            openDeliveryPopup(nextPopupIndex)
            nextPopupIndex += 1
          }, DELIVERY_POPUP_ROTATION_MS)
        })

        setMapState('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        if (initRetryCount === 0) {
          initRetryCount += 1
          clearInitRetryTimer()
          initRetryTimer = window.setTimeout(() => {
            initializeMap()
          }, 400)
          return
        }

        console.error('DisplayDeliveryMap init failed', error)
        setMapState('error')
      }
    }

    setMapState('loading')
    injectPopupStyles()

    loadGoogleMapsApi(apiKey)
      .then(() => {
        initializeMap()
      })
      .catch(error => {
        if (cancelled) return
        console.error('DisplayDeliveryMap Google Maps load failed', error)
        setMapState('error')
      })

    return () => {
      cancelled = true
      clearInitRetryTimer()
      if (popupRotationTimer) {
        window.clearInterval(popupRotationTimer)
      }
    }
  }, [apiKey, deliveries, enabled, payload])

  if (isLoading && !payload) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <ActivityIndicator color={ppcColors.accentInfo || '#0EA5E9'} />
        <Text style={styles.emptyTitle}>Carregando entregas recentes</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>Sem pedidos na fila</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    )
  }

  if (!enabled) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>Sem pedidos na fila</Text>
        <Text style={styles.emptyText}>
          Configure a chave do Google Maps para exibir as ultimas entregas.
        </Text>
      </View>
    )
  }

  if (deliveries.length === 0) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>Sem pedidos na fila</Text>
        <Text style={styles.emptyText}>Nenhuma entrega recente com endereco para exibir.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.mapWrap, tvMode && styles.tvMapWrap]}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapTitle}>Ultimas entregas</Text>
          <Text style={styles.mapSubtitle}>
            Caminhos saindo da loja. Finalizados: ultimos 10.
          </Text>
        </View>
        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendStoreDot]} />
            <Text style={styles.legendText}>Loja</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
            <Text style={styles.legendText}>Em entrega</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Finalizado</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapCard}>
        {Platform.OS === 'web' ? (
          <View ref={containerRef} style={styles.mapViewport} />
        ) : (
          <View style={styles.nativeFallback}>
            <Text style={styles.emptyText}>
              Mapa de entregas disponivel apenas no display web.
            </Text>
          </View>
        )}

        {((isLoading && !payload) || mapState === 'loading') && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator color={ppcColors.accentInfo || '#0EA5E9'} />
            <Text style={styles.mapOverlayText}>Montando mapa...</Text>
          </View>
        )}

        {mapState === 'empty' && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>
              Nao foi possivel localizar os enderecos no mapa.
            </Text>
          </View>
        )}

        {mapState === 'error' && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>
              Nao foi possivel carregar o Google Maps.
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default DisplayDeliveryMap
