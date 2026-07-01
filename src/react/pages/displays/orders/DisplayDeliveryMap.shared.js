const normalizeText = value => String(value || '').trim();

const normalizeCoordinate = value => {
  const coordinate = Number(String(value || '').replace(',', '.'));

  return Number.isFinite(coordinate) ? coordinate : null;
};

const resolveAddressCoordinates = address => {
  if (!address || typeof address !== 'object') {
    return null;
  }

  const latitude = [
    address.latitude,
    address.lat,
    address.location?.latitude,
    address.location?.lat,
    address.coords?.latitude,
    address.coords?.lat,
    address.coordinate?.latitude,
    address.coordinate?.lat,
  ]
    .map(normalizeCoordinate)
    .find(value => value !== null);

  const longitude = [
    address.longitude,
    address.lng,
    address.lon,
    address.location?.longitude,
    address.location?.lng,
    address.coords?.longitude,
    address.coords?.lng,
    address.coordinate?.longitude,
    address.coordinate?.lng,
  ]
    .map(normalizeCoordinate)
    .find(value => value !== null);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    ...address,
    latitude,
    longitude,
  };
};

const getDeliveryTitle = delivery => {
  const displayCode = normalizeText(delivery?.displayCode);
  const id = normalizeText(delivery?.id);

  return displayCode ? `#${displayCode}` : id ? `#${id}` : 'Entrega';
};

const getStatusKey = delivery =>
  normalizeText(delivery?.status?.status || delivery?.status).toLowerCase();

const getRouteColor = delivery => {
  const status = getStatusKey(delivery);

  if (status === 'closed') return '#15803D';
  if (status === 'way' || status === 'away') return '#0369A1';

  return normalizeText(delivery?.status?.color) || '#0EA5E9';
};

export const buildDisplayDeliveryMapConfig = payload => {
  const deliveries = Array.isArray(payload?.deliveries) ? payload.deliveries : [];
  const providerAddress = resolveAddressCoordinates(
    payload?.provider?.address || payload?.provider || payload?.address || null,
  );

  const markers = deliveries
    .map((delivery, index) => {
      const address = resolveAddressCoordinates(delivery?.address || delivery);

      if (!address) {
        return null;
      }

      return {
        ...address,
        id:
          normalizeText(delivery?.id) ||
          normalizeText(delivery?.displayCode) ||
          `delivery-${index}`,
        title: getDeliveryTitle(delivery),
        companyName:
          normalizeText(delivery?.client?.alias || delivery?.client?.name) ||
          normalizeText(payload?.provider?.alias || payload?.provider?.name) ||
          'Entrega',
        addressLine: normalizeText(address.formatted || address.streetLine || address.searchFor),
        addressExtra: normalizeText(
          [delivery?.status?.status || delivery?.status, delivery?.client?.name]
            .filter(Boolean)
            .join(' • '),
        ),
        distanceLabel: '',
        openingHours: '',
        phoneLabel: '',
      };
    })
    .filter(Boolean);

  const paths = markers
    .filter(marker => providerAddress && Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
    .map(marker => ({
      id: `${normalizeText(providerAddress.id || 'provider')}-${marker.id}`,
      from: providerAddress,
      to: marker,
      color: getRouteColor(deliveries.find(item => normalizeText(item?.id) === marker.id) || marker),
    }));

  return {
    ...payload,
    addresses: {
      origin: providerAddress,
      markers,
      user: null,
    },
    paths,
  };
};
