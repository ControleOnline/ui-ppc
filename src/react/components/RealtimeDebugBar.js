import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

const normalizeText = value => String(value || '').trim();

const formatClock = value => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '--';
  }

  try {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    const pad = entry => String(entry).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (e) {
    return '--';
  }
};

const truncateText = (value, max = 44) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length <= max) {
    return normalized || '--';
  }

  return `${normalized.slice(0, max - 3)}...`;
};

const createStyles = ppcColors =>
  StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBgSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 2,
    },
    line: {
      color: ppcColors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    accent: {
      color: ppcColors.accentInfo,
      fontWeight: '800',
    },
  });

const RealtimeDebugBar = ({
  companyId,
  ppcColors,
  refreshState = {},
  websocketStatus = {},
}) => {
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const socketConnected = Boolean(websocketStatus?.connected);
  const socketIdentified = Boolean(websocketStatus?.identified);
  const socketStateLabel = socketConnected
    ? socketIdentified
      ? 'socket:on'
      : 'socket:open'
    : `socket:${normalizeText(websocketStatus?.status) || 'off'}`;

  const lastSocketStores = Array.isArray(websocketStatus?.lastStores)
    ? websocketStatus.lastStores.filter(Boolean).join(', ')
    : '';
  const lastSocketCompanies = Array.isArray(websocketStatus?.lastCompanies)
    ? websocketStatus.lastCompanies.filter(Boolean).join(', ')
    : '';
  const refreshSource = normalizeText(refreshState?.lastSource) || '--';
  const refreshDetail = normalizeText(refreshState?.lastDetail);

  return (
    <View style={styles.container}>
      <Text style={styles.line}>
        <Text style={styles.accent}>Realtime</Text> {socketStateLabel} | empresa:{' '}
        {normalizeText(companyId) || '--'} | device:{' '}
        {truncateText(websocketStatus?.device)}
      </Text>
      <Text style={styles.line}>
        ultimo socket: {formatClock(websocketStatus?.lastEventAt)} | eventos:{' '}
        {Number(websocketStatus?.lastEventCount || 0)} | stores:{' '}
        {truncateText(lastSocketStores || '--', 34)} | empresas:{' '}
        {truncateText(lastSocketCompanies || '--', 18)}
      </Text>
      <Text style={styles.line}>
        ultimo refresh: {formatClock(refreshState?.lastAt)} | origem: {refreshSource}
        {refreshDetail ? ` (${truncateText(refreshDetail, 32)})` : ''}
      </Text>
    </View>
  );
};

export default RealtimeDebugBar;
