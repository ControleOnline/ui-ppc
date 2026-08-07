import React, { useCallback, useMemo, useState } from 'react';
import { View, useWindowDimensions, Pressable, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';
import { api } from '@controleonline/ui-common/src/api';
import { app_type } from '@appType';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import createStyles from './displayPage.styles';
import {
  buildForcedDisplayParams,
  doesDeviceConfigBelongToRuntime,
  doesDisplayBelongToCompany,
  normalizeEntityId,
  resolveForcedDisplayId,
} from '@controleonline/ui-ppc/src/react/utils/forcedDisplay';
import { DISPLAY_TYPE_PRODUCTION } from '@controleonline/ui-ppc/src/react/utils/displayTypes';

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png');

const DisplaysPage = () => {
  const { width } = useWindowDimensions();
  const displaysStore = useStore('displays');
  const displayQueuesStore = useStore('display_queues');
  const deviceConfigStore = useStore('device_config');
  const deviceStore = useStore('device');
  const navigation = useNavigation();
  const { ppcColors, brandColors, currentCompany } = useDisplayTheme();

  const { actions, items, isLoading, error, columns } = displaysStore;
  const { actions: displayQueuesActions } = displayQueuesStore;
  const { item: deviceConfig } = deviceConfigStore.getters;
  const { item: currentDevice } = deviceStore.getters;
  const [displayQueuesRows, setDisplayQueuesRows] = useState([]);

  const forcedDisplayId = useMemo(
    () =>
      doesDeviceConfigBelongToRuntime(deviceConfig, {
        companyId: currentCompany?.id,
        deviceId: currentDevice?.id || currentDevice?.device,
        type: 'DISPLAY',
      })
        ? resolveForcedDisplayId(deviceConfig)
        : null,
    [currentCompany?.id, currentDevice?.device, currentDevice?.id, deviceConfig],
  );

  const styles = useMemo(
    () => createStyles(ppcColors, brandColors),
    [brandColors, ppcColors],
  );

  const isCompact = width < 920;

  const requestParams = useMemo(
    () => (currentCompany?.id ? { company: currentCompany.id } : {}),
    [currentCompany?.id],
  );

  const openForcedDisplay = useCallback(
    display => {
      const params = buildForcedDisplayParams(display);
      if (!params) {
        return false;
      }
      navigation.replace('DisplayDetails', params);
      return true;
    },
    [navigation],
  );

  const refreshDisplays = useCallback(async () => {
    if (!currentCompany?.id) return;

    if (forcedDisplayId) {
      try {
        const forcedDisplay = await api.fetch(`displays/${forcedDisplayId}`);
        if (
          forcedDisplay?.id &&
          doesDisplayBelongToCompany(forcedDisplay, currentCompany.id) &&
          openForcedDisplay(forcedDisplay)
        ) {
          return;
        }
      } catch {
        // segue para a listagem quando o display vinculado nao existe
      }
    }

    const displays = await actions.getItems(requestParams);
    const displayIds = (Array.isArray(displays) ? displays : [])
      .map(row => normalizeEntityId(row?.id || row?.['@id'] || row))
      .filter(Boolean);

    if (!displayIds.length) {
      setDisplayQueuesRows([]);
      return;
    }

    const linked = await displayQueuesActions.getItems({
      pagination: false,
    });
    const linkedRows = Array.isArray(linked) ? linked : [];
    const filtered = linkedRows.filter(row => {
      const displayId = normalizeEntityId(
        row?.display?.id || row?.display?.['@id'] || row?.display,
      );
      return displayId && displayIds.includes(displayId);
    });
    setDisplayQueuesRows(filtered);
  }, [
    actions,
    currentCompany?.id,
    displayQueuesActions,
    forcedDisplayId,
    openForcedDisplay,
    requestParams,
  ]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplays();
    }, [refreshDisplays]),
  );

  const prefetchedByDisplay = useMemo(() => {
    const grouped = {};
    (Array.isArray(displayQueuesRows) ? displayQueuesRows : []).forEach(row => {
      const displayId = normalizeEntityId(
        row?.display?.id || row?.display?.['@id'] || row?.display,
      );
      if (!displayId) return;
      if (!grouped[displayId]) grouped[displayId] = [];
      grouped[displayId].push(row);
    });
    return grouped;
  }, [displayQueuesRows]);

  const openDisplay = useCallback(
    item => {
      navigation.navigate('DisplayDetails', {
        id: item.id,
        displayType: item?.displayType,
      });
    },
    [navigation],
  );

  const addDisplay = useCallback(() => {
    navigation.navigate('DisplayForm', {
      display: null,
      display_type: DISPLAY_TYPE_PRODUCTION,
    });
  }, [navigation]);

  const renderDisplayCard = useCallback(
    ({ item }) => {
      if (!item) return null;
      const displayId = normalizeEntityId(item?.id || item?.['@id']);
      return (
        <View style={styles.itemWrapper}>
          <DisplayCard
            item={item}
            prefetchedDisplayQueues={prefetchedByDisplay[displayId] || prefetchedByDisplay[item.id] || []}
            ppcColorsOverride={ppcColors}
            onPress={() => openDisplay(item)}
            onLinked={refreshDisplays}
            editable={app_type === 'MANAGER'}
          />
        </View>
      );
    },
    [openDisplay, ppcColors, prefetchedByDisplay, refreshDisplays, styles.itemWrapper],
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StateStore stores={['displays', 'display_queues', 'device_config']} />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={[styles.heroTopRow, isCompact && styles.heroTopRowCompact]}>
          <View style={styles.heroIdentity}>
            <View style={styles.heroLogoWrap}>
              <Image source={BRAND_LOGO} style={styles.heroLogo} resizeMode="contain" />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{global.t?.t('products', 'label', 'ppc')}</Text>
              <Text style={styles.heroSubtitle}>
                {global.t?.t('products', 'label', 'displayManager')}
              </Text>
            </View>
          </View>

          <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
            <View style={styles.countPill}>
              <Text style={styles.countNumber}>
                {items?.length || 0} {global.t?.t('products', 'label', 'enabled')}
              </Text>
            </View>

            {app_type === 'MANAGER' && (
              <Pressable style={styles.addButton} onPress={addDisplay}>
                <Icon name="plus" size={24} color={ppcColors.pillTextDark} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <DefaultTable
          storeName="displays"
          requestParams={requestParams}
          columns={columns}
          initialViewMode="cards"
          forceCardsOnCompact
          isLoading={isLoading}
          add={app_type === 'MANAGER'}
          onAdd={addDisplay}
          onRowPress={openDisplay}
          showRowActions={false}
          renderCard={renderDisplayCard}
          searchProps={{
            compact: true,
            placeholder:
              global.t?.t('configs', 'input', 'searchDisplay') || 'Buscar display...',
            searchKey: 'search',
            storeName: 'displays',
          }}
          totalItemsLabel="displays"
          visibleColumnsPreferenceKey="display-list"
          accentColor={brandColors?.primary || '#0EA5E9'}
        />
      </View>
    </SafeAreaView>
  );
};

export default DisplaysPage;
