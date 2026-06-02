import React, {useEffect, useMemo, useRef, useState} from 'react'
import {ActivityIndicator, Platform, StyleSheet, Text, View} from 'react-native'
import {WebView} from 'react-native-webview'
import {env} from '@env'
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain'

import createStyles from './DisplayDeliveryMap.styles'
import {resolveDisplayDeliveryAndroidWebViewApiKey} from './DisplayDeliveryMap.shared'

const getNativeMapComponents = () => {
  if (Platform.OS === 'android') {
    return null
  }

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

const parseGoogleJsCoordinate = value => {
  const coordinate = Number(value)
  return Number.isFinite(coordinate) && coordinate !== 0 ? coordinate : null
}

const getStatusKey = delivery =>
  normalizeText(delivery?.status?.status || delivery?.status).toLowerCase()

const getStatusLabel = delivery => {
  const status = getStatusKey(delivery)
  if (status === 'closed') return global.t?.t('display', 'status', 'closed')
  if (status === 'way' || status === 'away') return global.t?.t('display', 'status', 'inDelivery')
  return normalizeText(delivery?.status?.status || delivery?.status) || global.t?.t('display', 'status', 'delivery')
}

const getStatusColor = delivery => {
  const status = getStatusKey(delivery)
  if (status === 'closed') return '#16A34A'
  if (status === 'way' || status === 'away') return '#0EA5E9'
  return normalizeText(delivery?.status?.color)
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
  return displayCode ? `#${displayCode}` : id ? `#${id}` : global.t?.t('display', 'title', 'delivery')
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

const getGoogleJsPositionFromAddressPayload = address => {
  const latitude = parseGoogleJsCoordinate(address?.latitude)
  const longitude = parseGoogleJsCoordinate(address?.longitude)

  if (latitude === null || longitude === null) {
    return null
  }

  return {
    lat: latitude,
    lng: longitude,
  }
}

const getGoogleJsDeliveryPositionFromPayload = delivery =>
  getGoogleJsPositionFromAddressPayload(delivery?.address) ||
  getGoogleJsPositionFromAddressPayload(delivery)

const getGoogleJsProviderPositionFromPayload = payload =>
  getGoogleJsPositionFromAddressPayload(payload?.provider?.address)

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

const escapeHtml = value =>
  normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const svgToDataUrl = svg =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

const buildWebViewPinIcon = ({color, label, isStore = false}) =>
  svgToDataUrl(`
    <svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity=".32"/>
        </filter>
      </defs>
      <path filter="url(#shadow)" d="M24 4C13.7 4 6 11.7 6 21.8C6 35.8 24 55 24 55S42 35.8 42 21.8C42 11.7 34.3 4 24 4Z" fill="${escapeHtml(color)}" stroke="${isStore ? '#FBBF24' : '#FFFFFF'}" stroke-width="4"/>
      <circle cx="24" cy="22" r="11" fill="${isStore ? '#FBBF24' : '#0F172A'}" fill-opacity="${isStore ? '.18' : '.22'}"/>
      <text x="24" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="${isStore ? '#111827' : '#FFFFFF'}">${escapeHtml(label)}</text>
    </svg>
  `)

const serializeForHtml = value =>
  JSON.stringify(value).replace(/</g, '\\u003c')

const resolveWebViewBaseUrl = () => {
  const host = resolveAppDomain(env?.DOMAIN)
  return host ? `https://${host}/` : 'https://app.controleonline.com/'
}

const buildAndroidWebMapHtml = ({
  apiKey,
  deliveryEntries,
  originPosition,
  payload,
}) => {
  const providerName = normalizeText(
    payload?.provider?.alias || payload?.provider?.name || global.t?.t('display', 'label', 'store'),
  )
  const providerAddress = getProviderAddressText(payload)
  const storeLabel = normalizeText(global.t?.t('display', 'label', 'store'))
  const storeShortLabel = normalizeText(global.t?.t('display', 'label', 'storeShort'))
  const statusLabel = normalizeText(global.t?.t('display', 'label', 'status'))
  const unableLoadGoogleMapsMessage = normalizeText(
    global.t?.t('display', 'message', 'unableLoadGoogleMaps'),
  )
  const unableAuthenticateDisplayGoogleMapsKeyMessage = normalizeText(
    global.t?.t('display', 'message', 'unableAuthenticateDisplayGoogleMapsKey'),
  )
  const errorLoadingGoogleMapsMessage = normalizeText(
    global.t?.t('display', 'message', 'errorLoadingGoogleMaps'),
  )
  const unableLocateAddressesOnMapMessage = normalizeText(
    global.t?.t('display', 'message', 'unableLocateAddressesOnMap'),
  )
  const serializedPayload = serializeForHtml({
    center: originPosition || deliveryEntries[0]?.position || null,
    store:
      payload?.provider
        ? {
            position: originPosition,
            title: escapeHtml(providerName),
            address: escapeHtml(providerAddress),
            iconUrl: buildWebViewPinIcon({
              color: '#111827',
              label: storeShortLabel,
              isStore: true,
            }),
          }
        : null,
    deliveries: deliveryEntries.map(entry => {
      const clientName = normalizeText(
        entry.delivery?.client?.alias || entry.delivery?.client?.name,
      )

      return {
        id: normalizeText(entry.delivery?.id || entry.index),
        title: escapeHtml(getDeliveryTitle(entry.delivery)),
        statusLabel: escapeHtml(getStatusLabel(entry.delivery)),
        statusKey: escapeHtml(getStatusKey(entry.delivery)),
        clientName: escapeHtml(clientName),
        address: escapeHtml(getDeliveryAddressText(entry.delivery)),
        routeColor: getRouteColor(entry.delivery),
        iconUrl: buildWebViewPinIcon({
          color: getStatusColor(entry.delivery),
          label: String(entry.index + 1),
        }),
        position: entry.position,
      }
    }),
  })

  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <style>
        html, body, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #e5edf5;
          font-family: Arial, sans-serif;
        }

        #error {
          position: absolute;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.78);
          color: #ffffff;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          z-index: 10;
        }

        .info-card {
          min-width: 180px;
          max-width: 240px;
          color: #0f172a;
          line-height: 1.4;
        }

        .info-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .info-pill {
          display: inline-block;
          margin-bottom: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .info-line {
          margin-bottom: 4px;
          font-size: 12px;
        }

        .info-muted {
          margin-top: 8px;
          color: #64748b;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="error"></div>
      <script>
        const MAP_DATA = ${serializedPayload};

        const postMessage = payload => {
          if (!window.ReactNativeWebView) return;
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        };

        const bridgeConsole = method => {
          const original = console[method];

          console[method] = function bridgedConsole() {
            const args = Array.prototype.slice.call(arguments).map(item => {
              if (typeof item === 'string') return item;

              try {
                return JSON.stringify(item);
              } catch (error) {
                return String(item);
              }
            });

            postMessage({
              type: 'console',
              level: method,
              message: args.join(' '),
            });

            if (typeof original === 'function') {
              return original.apply(console, arguments);
            }

            return undefined;
          };
        };

        bridgeConsole('log');
        bridgeConsole('warn');
        bridgeConsole('error');

        const showError = message => {
          const errorElement = document.getElementById('error');
          errorElement.textContent = message;
          errorElement.style.display = 'flex';
          postMessage({ type: 'error', message });
        };

        const createInfoContent = item => {
          const clientLine = item.clientName ? '<div class="info-line">' + item.clientName + '</div>' : '';
          const addressLine = item.address ? '<div class="info-line">' + item.address + '</div>' : '';
          const statusLine = item.statusKey ? '<div class="info-muted">${escapeHtml(statusLabel)}: ' + item.statusKey + '</div>' : '';

          return [
            '<div class="info-card">',
            '<div class="info-title">' + item.title + '</div>',
            '<div class="info-pill">' + item.statusLabel + '</div>',
            clientLine,
            addressLine,
            statusLine,
            '</div>',
          ].join('');
        };

        window.handleMapError = function handleMapError() {
          showError(${serializeForHtml(unableLoadGoogleMapsMessage)});
        };

        window.gm_authFailure = function gmAuthFailure() {
          showError(${serializeForHtml(unableAuthenticateDisplayGoogleMapsKeyMessage)});
        };

        window.addEventListener('error', function handleWindowError(event) {
          const message = event && event.message ? event.message : ${serializeForHtml(errorLoadingGoogleMapsMessage)};
          postMessage({ type: 'window-error', message });
        });

        window.initMap = function initMap() {
          try {
            const defaultCenter = MAP_DATA.center || { lat: -23.55052, lng: -46.633308 };
            const map = new google.maps.Map(document.getElementById('map'), {
              center: defaultCenter,
              zoom: 12,
              disableDefaultUI: true,
              zoomControl: true,
              fullscreenControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              gestureHandling: 'greedy',
            });

            const geocoder = new google.maps.Geocoder();
            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow({ maxWidth: 260 });
            let markerCount = 0;

            const geocodeAddress = address => new Promise(resolve => {
              if (!address) {
                resolve(null);
                return;
              }

              geocoder.geocode({ address }, (results, status) => {
                if (status !== 'OK' || !results || !results[0] || !results[0].geometry || !results[0].geometry.location) {
                  resolve(null);
                  return;
                }

                const location = results[0].geometry.location;
                resolve({
                  lat: location.lat(),
                  lng: location.lng(),
                });
              });
            });

            const resolvePosition = item => {
              if (
                item &&
                item.position &&
                Number.isFinite(item.position.lat) &&
                Number.isFinite(item.position.lng)
              ) {
                return Promise.resolve(item.position);
              }

              return geocodeAddress(item ? item.address : '');
            };

            Promise.all([
              MAP_DATA.store ? resolvePosition(MAP_DATA.store) : Promise.resolve(null),
              Promise.all(
                MAP_DATA.deliveries.map(item =>
                  resolvePosition(item).then(position => ({
                    ...item,
                    position,
                  })),
                ),
              ),
            ]).then(([storePosition, resolvedDeliveries]) => {
              if (storePosition) {
                const marker = new google.maps.Marker({
                  map,
                  position: storePosition,
                  title: MAP_DATA.store.title,
                  icon: {
                    url: MAP_DATA.store.iconUrl,
                    scaledSize: new google.maps.Size(48, 60),
                    anchor: new google.maps.Point(24, 56),
                  },
                });

                marker.addListener('click', () => {
                  infoWindow.setContent(createInfoContent({
                    title: MAP_DATA.store.title,
                    statusLabel: ${serializeForHtml(storeLabel)},
                    clientName: '',
                    address: MAP_DATA.store.address,
                    statusKey: '',
                  }));
                  infoWindow.open({anchor: marker, map});
                });

                bounds.extend(storePosition);
                markerCount += 1;
              }

              let firstDeliveryMarker = null;

              resolvedDeliveries.forEach(item => {
                if (!item.position) {
                  return;
                }

                if (storePosition) {
                  new google.maps.Polyline({
                    map,
                    path: [storePosition, item.position],
                    strokeColor: item.routeColor,
                    strokeOpacity: 0.92,
                    strokeWeight: 4,
                    geodesic: true,
                  });
                }

                const marker = new google.maps.Marker({
                  map,
                  position: item.position,
                  title: item.title,
                  icon: {
                    url: item.iconUrl,
                    scaledSize: new google.maps.Size(48, 60),
                    anchor: new google.maps.Point(24, 56),
                  },
                });

                marker.addListener('click', () => {
                  infoWindow.setContent(createInfoContent(item));
                  infoWindow.open({anchor: marker, map});
                });

                if (!firstDeliveryMarker) {
                  firstDeliveryMarker = {marker, item};
                }

                bounds.extend(item.position);
                markerCount += 1;
              });

              if (markerCount === 0) {
                showError(${serializeForHtml(unableLocateAddressesOnMapMessage)});
                return;
              }

              if (markerCount === 1) {
                map.setCenter(storePosition || defaultCenter);
                map.setZoom(15);
              } else {
                map.fitBounds(bounds, 56);
              }

              if (firstDeliveryMarker) {
                infoWindow.setContent(createInfoContent(firstDeliveryMarker.item));
                infoWindow.open({anchor: firstDeliveryMarker.marker, map});
              }

              postMessage({type: 'ready'});
            }).catch(() => {
              showError(${serializeForHtml(unableLocateAddressesOnMapMessage)});
            });
          } catch (error) {
            showError(${serializeForHtml(unableLoadGoogleMapsMessage)});
          }
        };
      </script>
      <script
        async
        defer
        src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey,
        )}&loading=async&callback=initMap"
        onerror="handleMapError()"></script>
    </body>
  </html>`
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
      <Text style={nativeStyles.calloutMuted}>
        {global.t?.t('display', 'label', 'status')}: {getStatusKey(delivery)}
      </Text>
    </View>
  )
}

const StoreCallout = ({payload}) => {
  const providerName = normalizeText(
    payload?.provider?.alias || payload?.provider?.name || global.t?.t('display', 'label', 'store'),
  )
  const addressText = getProviderAddressText(payload)

  return (
    <View style={nativeStyles.calloutCard}>
      <Text style={nativeStyles.calloutTitle}>{providerName}</Text>
      <View style={[nativeStyles.statusPill, nativeStyles.storePill]}>
        <Text style={nativeStyles.statusPillText}>{global.t?.t('display', 'label', 'store')}</Text>
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
  const [androidMapState, setAndroidMapState] = useState('loading')
  const [androidMapErrorMessage, setAndroidMapErrorMessage] = useState('')
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const apiKey = resolveDisplayDeliveryAndroidWebViewApiKey(payload)
  const deliveries = useMemo(
    () => (Array.isArray(payload?.deliveries) ? payload.deliveries : []),
    [payload?.deliveries],
  )
  const enabled = Boolean(payload?.enabled && apiKey)

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
  const androidDeliveryEntries = useMemo(
    () =>
      deliveries.map((delivery, index) => ({
        delivery,
        index,
        position: getGoogleJsDeliveryPositionFromPayload(delivery),
      })),
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
  const hasAndroidRenderableDeliveries = useMemo(
    () =>
      androidDeliveryEntries.some(
        entry => entry.position || normalizeText(getDeliveryAddressText(entry.delivery)),
      ),
    [androidDeliveryEntries],
  )
  const shouldRenderMap =
    !(
      (isLoading && !payload) ||
      error ||
      !enabled ||
      (Platform.OS === 'android'
        ? !hasAndroidRenderableDeliveries
        : deliveryEntries.length === 0)
    )
  const androidMapBaseUrl = useMemo(() => resolveWebViewBaseUrl(), [])
  const androidMapHtml = useMemo(() => {
    if (Platform.OS !== 'android' || !shouldRenderMap) {
      return ''
    }

    return buildAndroidWebMapHtml({
      apiKey,
      deliveryEntries: androidDeliveryEntries,
      originPosition: getGoogleJsProviderPositionFromPayload(payload),
      payload,
    })
  }, [apiKey, androidDeliveryEntries, payload, shouldRenderMap])

  useEffect(() => {
    if (!shouldRenderMap) {
      setMapReady(false)
      setAndroidMapState('loading')
      setAndroidMapErrorMessage('')
    }
  }, [shouldRenderMap])

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    if (!shouldRenderMap) {
      setAndroidMapState('loading')
      setAndroidMapErrorMessage('')
      return
    }

    setAndroidMapState('loading')
    setAndroidMapErrorMessage('')
  }, [androidMapHtml, shouldRenderMap])

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

  if (Platform.OS !== 'android' && !HAS_NATIVE_MAP_SUPPORT) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'mapUnavailableOnDevice')}</Text>
        <Text style={styles.emptyText}>
          {global.t?.t('display', 'message', 'nativeMapSupportUnavailable')}
        </Text>
      </View>
    )
  }

  if (isLoading && !payload) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <ActivityIndicator color={ppcColors.accentInfo} />
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'loadingRecentDeliveries')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    )
  }

  if (!enabled) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>
          {global.t?.t('display', 'message', 'configureDisplayGoogleMapsKey')}
        </Text>
      </View>
    )
  }

  if (Platform.OS === 'android' ? !hasAndroidRenderableDeliveries : deliveryEntries.length === 0) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>
          {global.t?.t('display', 'message', 'noRecentDeliveriesWithAddress')}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.mapWrap, tvMode && styles.tvMapWrap]}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapTitle}>{global.t?.t('display', 'title', 'latestDeliveries')}</Text>
          <Text style={styles.mapSubtitle}>
            {global.t?.t('display', 'message', 'routesLeavingStoreLastTenCompleted')}
          </Text>
        </View>
        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendStoreDot]} />
            <Text style={styles.legendText}>{global.t?.t('display', 'label', 'store')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#0EA5E9'}]} />
            <Text style={styles.legendText}>{global.t?.t('display', 'status', 'inDelivery')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#16A34A'}]} />
            <Text style={styles.legendText}>{global.t?.t('display', 'status', 'closed')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapCard}>
        {Platform.OS === 'android' ? (
          <>
            <WebView
              source={{html: androidMapHtml, baseUrl: androidMapBaseUrl}}
              style={styles.mapViewport}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              onMessage={event => {
                try {
                  const message = JSON.parse(event.nativeEvent.data)

                  if (message?.type === 'ready') {
                    setAndroidMapState('ready')
                    setAndroidMapErrorMessage('')
                    return
                  }

                  if (message?.type === 'error') {
                    setAndroidMapState('error')
                    setAndroidMapErrorMessage(normalizeText(message?.message))
                    return
                  }

                  if (message?.type === 'window-error') {
                    setAndroidMapState('error')
                    setAndroidMapErrorMessage(normalizeText(message?.message))
                    return
                  }

                  if (message?.type === 'console') {
                    const consoleMessage = normalizeText(message?.message)

                    if (
                      /google maps|maps api|referernotallowedmaperror|billingnotenabledmaperror|apikey|invalidkeymaperror|apinotactivatedmaperror/i.test(
                        consoleMessage,
                      )
                    ) {
                      setAndroidMapErrorMessage(consoleMessage)
                    }
                  }
                } catch {
                  setAndroidMapState('error')
                }
              }}
              onError={() => setAndroidMapState('error')}
            />
            {androidMapState !== 'ready' ? (
              <View style={styles.mapOverlay}>
                {androidMapState !== 'error' ? (
                  <ActivityIndicator color={ppcColors.accentInfo} />
                ) : null}
                <Text style={styles.mapOverlayText}>
                  {androidMapState === 'error'
                    ? androidMapErrorMessage ||
                      global.t?.t('display', 'message', 'unableLoadGoogleMapsOnAndroid')
                    : global.t?.t('display', 'message', 'loadingDeliveryMap')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
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
                title={global.t?.t('display', 'label', 'store')}
                zIndex={1000}>
                <MarkerPin
                  color="#FBBF24"
                  label={global.t?.t('display', 'label', 'storeShort')}
                  isStore
                />
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
        )}
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
