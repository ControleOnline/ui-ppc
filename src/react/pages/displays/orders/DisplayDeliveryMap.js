import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'

import createStyles from './DisplayDeliveryMap.styles'

const GOOGLE_MAPS_SCRIPT_ID = 'display-delivery-google-maps-api-script'
const GOOGLE_MAPS_CALLBACK_NAME = '__displayDeliveryGoogleMapsApiReady__'

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

const getDeliveryTitle = delivery => {
  const displayCode = normalizeText(delivery?.displayCode)
  const id = normalizeText(delivery?.id)
  return displayCode ? `#${displayCode}` : id ? `#${id}` : 'Entrega'
}

const getDeliveryAddressText = delivery =>
  normalizeText(
    delivery?.address?.formatted ||
    delivery?.address?.streetLine ||
    delivery?.address,
  )

const getDeliveryPositionFromPayload = delivery => {
  const latitude = parseCoordinate(
    delivery?.address?.latitude ?? delivery?.latitude,
  )
  const longitude = parseCoordinate(
    delivery?.address?.longitude ?? delivery?.longitude,
  )

  if (latitude === null || longitude === null) {
    return null
  }

  return { lat: latitude, lng: longitude }
}

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

  window.__displayDeliveryGoogleMapsPromise = new Promise((resolve, reject) => {
    const resolveMaps = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
        return
      }

      reject(new Error('google-maps-unavailable'))
    }

    const handleError = () => {
      window.__displayDeliveryGoogleMapsPromise = null
      reject(new Error('google-maps-load-failed'))
    }

    window[GOOGLE_MAPS_CALLBACK_NAME] = resolveMaps

    const existingDisplayScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existingDisplayScript) {
      existingDisplayScript.addEventListener('load', resolveMaps, { once: true })
      existingDisplayScript.addEventListener('error', handleError, { once: true })
      return
    }

    const existingMapsScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    )
    if (existingMapsScript) {
      existingMapsScript.addEventListener('load', resolveMaps, { once: true })
      existingMapsScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=${GOOGLE_MAPS_CALLBACK_NAME}`
    script.addEventListener('load', resolveMaps, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
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
    setMapState('loading')
    injectPopupStyles()

    loadGoogleMapsApi(apiKey)
      .then(async () => {
        if (cancelled || !window.google?.maps) return

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
        let markerCount = 0

        const markerEntries = await Promise.all(
          deliveries.map(async delivery => ({
            delivery,
            position: await resolveDeliveryPosition({ delivery, geocoder }),
          })),
        )

        if (cancelled) return

        markerEntries.forEach(({ delivery, position }) => {
          if (!position) return

          markerCount += 1
          bounds.extend(position)

          const marker = new google.maps.Marker({
            position,
            map,
            title: getDeliveryTitle(delivery),
            animation: google.maps.Animation.DROP,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: getStatusColor(delivery),
              fillOpacity: 0.96,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
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

        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (markerCount === 1 && map.getZoom() > 15) {
            map.setZoom(15)
          }
        })

        setMapState('ready')
      })
      .catch(() => {
        if (!cancelled) setMapState('error')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, deliveries, enabled])

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
            Em entrega sempre visivel. Finalizados: ultimos 10 do dia.
          </Text>
        </View>
        <View style={styles.legendWrap}>
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

        {(isLoading || mapState === 'loading') && (
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
