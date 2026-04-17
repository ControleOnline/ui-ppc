import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, useWindowDimensions, Pressable, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';
import { api } from '@controleonline/ui-common/src/api';
import { env } from '@env';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import createStyles from './displayPage.styles';
import {
  buildForcedDisplayParams,
  doesDeviceConfigBelongToRuntime,
  doesDisplayBelongToCompany,
  normalizeEntityId,
  resolveForcedDisplayId,
} from '@controleonline/ui-ppc/src/react/utils/forcedDisplay';

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png');

const DisplaysPage = () => {
  const { width } = useWindowDimensions();
  const displaysStore = useStore('displays');
  const displayQueuesStore = useStore('display_queues');
  const deviceConfigStore = useStore('device_config');
  const deviceStore = useStore('device');
  const navigation = useNavigation();
  const { ppcColors, brandColors, currentCompany } = useDisplayTheme();

  const { actions, items, isLoading, error } = displaysStore;
  const { actions: displayQueuesActions } = displayQueuesStore;
  const { item: deviceConfig } = deviceConfigStore.getters;
  const { item: currentDevice } = deviceStore.getters;
  const [displayQueuesRows, setDisplayQueuesRows] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
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

  const numColumns = useMemo(() => {
    if (width >= 1700) return 4;
    if (width >= 1260) return 3;
    if (width >= 760) return 2;
    return 1;
  }, [width]);
  const skeletonCount = useMemo(() => Math.max(numColumns * 2, 3), [numColumns]);
  const isCompact = width < 920;

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
    setVisibleCount(50);

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

    const displays = await actions.getItems({ company: currentCompany.id, itemsPerPage: 50 });
    const displayIds = (Array.isArray(displays) ? displays : [])
      .map(row => normalizeEntityId(row?.id || row?.['@id'] || row))
      .filter(Boolean);

    if (!displayIds.length) {
      setDisplayQueuesRows([]);
      return;
    }

    const linked = await displayQueuesActions.getItems({
      itemsPerPage: 1000,
      pagination: false,
    });
    const linkedRows = Array.isArray(linked) ? linked : [];
    const filtered = linkedRows.filter((row) => {
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
  ]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplays();
    }, [refreshDisplays]),
  );

  const prefetchedByDisplay = useMemo(() => {
    const grouped = {};
    (Array.isArray(displayQueuesRows) ? displayQueuesRows : []).forEach((row) => {
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
    (item) => {
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
      display_type: 'orders',
    });
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.itemWrapper}>
        <DisplayCard
          item={item}
          prefetchedDisplayQueues={prefetchedByDisplay[item.id] || []}
          ppcColorsOverride={ppcColors}
          onPress={() => openDisplay(item)}
          onLinked={refreshDisplays}
          editable={env.APP_TYPE === 'MANAGER'}
        />
      </View>
    ),
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
              <Text style={styles.heroTitle}>{global.t?.t('products','label','ppc')}</Text>
              <Text style={styles.heroSubtitle}>{global.t?.t('products','label','displayManager')}</Text>
            </View>
          </View>

          <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
            <View style={styles.countPill}>
              <Text style={styles.countNumber}>{items?.length || 0} {global.t?.t('products','label','enabled')}</Text>
            </View>

            {env.APP_TYPE === 'MANAGER' && (
              <Pressable style={styles.addButton} onPress={addDisplay}>
                <Icon name="plus" size={24} color={ppcColors.pillTextDark} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {!isLoading && !error && (
        <FlatList
          key={`cols-${numColumns}`}
          data={(Array.isArray(items) ? items : []).slice(0, visibleCount)}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : null}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (visibleCount < (items?.length || 0)) setVisibleCount(v => v + 50);
          }}
          onEndReachedThreshold={0.3}
        />
      )}
      {isLoading && (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <View key={`display-skeleton-${index}`} style={styles.skeletonCard}>
              <View style={styles.skeletonHeaderRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonTitleWrap}>
                  <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                </View>
              </View>
              <View style={styles.skeletonPillsRow}>
                <View style={[styles.skeletonPill, styles.skeletonPillWide]} />
                <View style={styles.skeletonPill} />
                <View style={styles.skeletonPill} />
              </View>
              <View style={styles.skeletonFooterRow}>
                <View style={styles.skeletonTag} />
                <View style={styles.skeletonAction} />
              </View>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};



export default DisplaysPage;
