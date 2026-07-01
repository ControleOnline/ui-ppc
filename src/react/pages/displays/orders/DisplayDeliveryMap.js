import React, {useMemo} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';

import DefaultMap from '@controleonline/ui-default/src/react/components/map/DefaultMap';

import createStyles from './DisplayDeliveryMap.styles';
import {buildDisplayDeliveryMapConfig} from './DisplayDeliveryMap.shared';

const DisplayDeliveryMap = ({
  payload = null,
  isLoading = false,
  error = '',
  ppcColors = {},
  tvMode = false,
}) => {
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const deliveries = useMemo(
    () => (Array.isArray(payload?.deliveries) ? payload.deliveries : []),
    [payload?.deliveries],
  );
  const mapConfig = useMemo(
    () => buildDisplayDeliveryMapConfig(payload),
    [payload],
  );

  if (isLoading && !payload) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <ActivityIndicator color={ppcColors.accentInfo} />
        <Text style={styles.emptyTitle}>
          {global.t?.t('display', 'title', 'loadingRecentDeliveries')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  if (!payload?.enabled) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>
          {global.t?.t('display', 'message', 'configureDisplayMap') || 'Mapa indisponivel no momento'}
        </Text>
      </View>
    );
  }

  if (deliveries.length === 0) {
    return (
      <View style={[styles.emptyWrap, tvMode && styles.tvEmptyWrap]}>
        <Text style={styles.emptyTitle}>{global.t?.t('display', 'title', 'noOrdersInQueue')}</Text>
        <Text style={styles.emptyText}>
          {global.t?.t('display', 'message', 'noRecentDeliveriesWithAddress')}
        </Text>
      </View>
    );
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
        <DefaultMap config={mapConfig} />
      </View>
    </View>
  );
};

export default DisplayDeliveryMap;
