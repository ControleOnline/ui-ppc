import React, {useEffect, useMemo, useRef, useState} from 'react'
import {ActivityIndicator, Platform, StyleSheet, Text, View} from 'react-native'

import createStyles from './DisplayDeliveryMap.styles'

const getNativeMapComponents = () => {
  try {
    return require('react-native-maps')
  } catch {
    return null
  }
}

const nativeMapComponents = getNativeMapComponents()
const NativeMapView = nativeMapComponents?.default || null
const Marker = nativeMapComponents?.Marker || null
const Callout = nativeMapComponents?.Callout || null
const Polyline = nativeMapComponents?.Polyline || null
const PROVIDER_GOOGLE = nativeMapComponents?.PROVIDER_GOOGLE || null
const HAS_NATIVE_MAP_SUPPORT = Boolean(NativeMapView && Marker && Callout)

const normalizeText = value => String(value || '').trim()

const parseCoordinate = value => {
  const coordinate = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(coordinate) ? coordinate : null
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

const getDeliveryAddressText = delivery => getAddressText(delivery?.address)
const getProviderAddressText = payload => getAddressText(payload?.provider?.address)

const getPositionFromAddressPayload = address => {
  const latitude = parseCoordinate(
    address?.latitude ||
      address?.lat ||
      address?.location?.latitude ||
      address?.location?.lat ||
      address?.coords?.latitude ||
      address?.coords?.lat ||
      address?.coordinate?.latitude ||
      address?.coordinate?.lat,
  )
  const longitude = parseCoordinate(
    address?.longitude ||
      address?.lng ||
      address?.lon ||
      address?.location?.longitude ||
      address?.location?.lng ||
      address?.coords?.longitude ||
      address?.coords?.lng ||
      address?.coordinate?.longitude ||
      address?.coordinate?.lng,
  )

  if (latitude === null || longitude === null) {
    return null
  }

  return {
    latitude,
    longitude,
  }
}

const getDeliveryPositionFromPayload = delivery =>
  getPositionFromAddressPayload(delivery?.address) ||
  getPositionFromAddressPayload(delivery)

const getProviderPositionFromPayload = payload =>
  getPositionFromAddressPayload(payload?.provider?.address)

const buildRegion = coordinates => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return {
      latitude: -23.55052,
      longitude: -46.633308,
      latitudeDelta: 0.24,
      longitudeDelta: 0.24,
    }
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    }
  }

  const latitudes = coordinates.map(item => item.latitude)
  const longitudes = coordinates.map(item => item.longitude)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.45, 0.04),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.45, 0.04),
  }
}

const MarkerPin = ({color, label, compact = false, isStore = false}) => (
  <View
    style={[
      nativeStyles.pinWrap,
      compact && nativeStyles.pinWrapCompact,
      isStore && nativeStyles.storePinWrap,
    ]}>
    <View
      style={[
        nativeStyles.pin,
        compact && nativeStyles.pinCompact,
        isStore && nativeStyles.storePin,
        {backgroundColor: color},
      ]}>
      <Text style={[nativeStyles.pinLabel, isStore && nativeStyles.storePinLabel]}>
        {label}
      </Text>
    </View>
  </View>
)

const DeliveryCallout = ({delivery}) => {
  const clientName = normalizeText(delivery?.client?.alias || delivery?.client?.name)
  const addressText = getDeliveryAddressText(delivery)

  return (
    <View style={nativeStyles.calloutCard}>
      <Text style={nativeStyles.calloutTitle}>{getDeliveryTitle(delivery)}</Text>
      <View
        style={[
          nativeStyles.statusPill,
          {backgroundColor: getStatusColor(delivery)},
        ]}>
        <Text style={nativeStyles.statusPillText}>{getStatusLabel(delivery)}</Text>
      </View>
      {clientName ? <Text style={nativeStyles.calloutLine}>{clientName}</Text> : null}
      {addressText ? <Text style={nativeStyles.calloutLine}>{addressText}</Text> : null}
      <Text style={nativeStyles.calloutMuted}>Status: {getStatusKey(delivery)}</Text>
    </View>
  )
}

const StoreCallout = ({payload}) => {
  const providerName = normalizeText(payload?.provider?.alias || payload?.provider?.name || 'Loja')
  const addressText = getProviderAddressText(payload)

  return (
    <View style={nativeStyles.calloutCard}>
      <Text style={nativeStyles.calloutTitle}>{providerName}</Text>
      <View style={[nativeStyles.statusPill, nativeStyles.storePill]}>
        <Text style={nativeStyles.statusPillText}>Loja</Text>
      </View>
      {addressText ? <Text style={nativeStyles.calloutLine}>{addressText}</Text> : null}
    </View>
  )
}

export default function DisplayDeliveryMap({
  payload = null,
  isLoading = false,
  error = '',
  ppcColors = {},
  tvMode = false,
}) {
  const mapRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const deliveries = useMemo(
    () => (Array.isArray(payload?.deliveries) ? payload.deliveries : []),
    [payload?.deliveries],
  )
  const enabled = Boolean(payload?.enabled && normalizeText(payload?.googleMapsApiKey))

  const originPosition = useMemo(
    () => getProviderPositionFromPayload(payload),
    [payload],
  )

  const deliveryEntries = useMemo(
    () =>
      deliveries
        .map((delivery, index) => ({
          delivery,
          index,
          position: getDeliveryPositionFromPayload(delivery),
        }))
        .filter(entry => entry.position),
    [deliveries],
  )

  const focusCoordinates = useMemo(() => {
    const coordinates = []

    if (originPosition) {
      coordinates.push(originPosition)
    }

    deliveryEntries.forEach(entry => {
      coordinates.push(entry.position)
    })

    return coordinates
  }, [deliveryEntries, originPosition])

  const initialRegion = useMemo(() => buildRegion(focusCoordinates), [focusCoordinates])
  const shouldRenderMap =
    !((isLoading && !payload) || error || !enabled || deliveryEntries.length === 0)

  useEffect(() => {
    if (!shouldRenderMap) {
      setMapReady(false)
    }
  }, [shouldRenderMap])

  useEffect(() => {
    if (!mapReady || !mapRef.current || focusCoordinates.length === 0) {
      return undefined
    }

    const timeoutId = setTimeout(() => {
      if (!mapRef.current) {
        return
      }

      if (focusCoordinates.length === 1) {
        mapRef.current.animateToRegion(buildRegion(focusCoordinates), 250)
        return
      }

      mapRef.current.fitToCoordinates(focusCoordinates, {
        animated: true,
        edgePadding: {
          top: 56,
          right: 56,
          bottom: 56,
          left: 56,
        },
      })
    }, 80)

    return () => clearTimeout(timeoutId)
  }, [focusCoordinates, mapReady])

  if (!HAS_NATIVE_MAP_SUPPORT) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>Mapa indisponivel no dispositivo</Text>
        <Text style={styles.emptyText}>
          O suporte nativo de mapa nao esta disponivel neste ambiente.
        </Text>
      </View>
    )
  }

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

  if (deliveryEntries.length === 0) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>Sem pedidos na fila</Text>
        <Text style={styles.emptyText}>
          Nenhuma entrega recente com endereco para exibir.
        </Text>
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
            <View style={[styles.legendDot, {backgroundColor: '#0EA5E9'}]} />
            <Text style={styles.legendText}>Em entrega</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#16A34A'}]} />
            <Text style={styles.legendText}>Finalizado</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapCard}>
        <NativeMapView
          ref={mapRef}
          style={styles.mapViewport}
          initialRegion={initialRegion}
          provider={Platform.OS === 'android' && PROVIDER_GOOGLE ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass
          rotateEnabled
          toolbarEnabled={false}
          onMapReady={() => setMapReady(true)}>
          {originPosition ? (
            <Marker
              key="delivery-origin"
              coordinate={originPosition}
              title="Loja"
              zIndex={1000}>
              <MarkerPin color="#FBBF24" label="L" isStore />
              <Callout tooltip>
                <StoreCallout payload={payload} />
              </Callout>
            </Marker>
          ) : null}

          {originPosition && Polyline
            ? deliveryEntries.map(entry => (
                <Polyline
                  key={`delivery-route-${entry.delivery?.id || entry.index}`}
                  coordinates={[originPosition, entry.position]}
                  strokeColor={getRouteColor(entry.delivery)}
                  strokeWidth={4}
                  geodesic
                />
              ))
            : null}

          {deliveryEntries.map(entry => (
            <Marker
              key={`delivery-marker-${entry.delivery?.id || entry.index}`}
              coordinate={entry.position}
              title={getDeliveryTitle(entry.delivery)}
              zIndex={100 + entry.index}>
              <MarkerPin
                color={getStatusColor(entry.delivery)}
                label={String(entry.index + 1)}
              />
              <Callout tooltip>
                <DeliveryCallout delivery={entry.delivery} />
              </Callout>
            </Marker>
          ))}
        </NativeMapView>
      </View>
    </View>
  )
}

const nativeStyles = StyleSheet.create({
  pinWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapCompact: {
    width: 40,
    height: 40,
  },
  storePinWrap: {
    width: 46,
    height: 46,
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  pinCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  storePin: {
    borderColor: '#FBBF24',
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  storePinLabel: {
    color: '#111827',
  },
  calloutCard: {
    minWidth: 228,
    maxWidth: 288,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  storePill: {
    backgroundColor: '#111827',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  calloutLine: {
    fontSize: 13,
    lineHeight: 19,
    color: '#0F172A',
    marginBottom: 4,
  },
  calloutMuted: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
})
