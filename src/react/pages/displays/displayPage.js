import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  useWindowDimensions,
  StyleSheet,
  Pressable,
  Text,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';
import { api } from '@controleonline/ui-common/src/api';
import { env } from '@env';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import {
  buildForcedDisplayParams,
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
  const navigation = useNavigation();
  const { ppcColors, brandColors, currentCompany } = useDisplayTheme();

  const { actions, items, isLoading, error } = displaysStore;
  const { actions: displayQueuesActions } = displayQueuesStore;
  const { item: deviceConfig } = deviceConfigStore.getters;
  const [displayQueuesRows, setDisplayQueuesRows] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const forcedDisplayId = useMemo(
    () => resolveForcedDisplayId(deviceConfig),
    [deviceConfig?.configs],
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
      } catch (e) {
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
              <Text style={styles.countLabel}>
                {currentCompany?.alias || currentCompany?.name}
              </Text>
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

const createStyles = (ppcColors, brandColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ppcColors.appBg,
    },
    hero: {
      marginHorizontal: 14,
      marginTop: 12,
      marginBottom: 14,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: ppcColors.panelBg,
      borderWidth: 1,
      borderColor: ppcColors.border,
      shadowColor: brandColors.primary,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 5,
      position: 'relative',
    },
    heroGlow: {
      position: 'absolute',
      top: -74,
      left: 52,
      width: 180,
      height: 180,
      borderRadius: 999,
      backgroundColor: withOpacity(ppcColors.accent, 0.16),
    },
    heroTopRow: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
    },
    heroTopRowCompact: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    heroIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    heroContent: {
      flex: 1,
    },
    heroLogoWrap: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.accent, 0.28),
      backgroundColor: withOpacity(ppcColors.accent, 0.06),
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroLogo: {
      width: 30,
      height: 30,
    },
    heroTitle: {
      color: ppcColors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    heroSubtitle: {
      marginTop: 3,
      color: ppcColors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    },
    heroActionsCompact: {
      width: '100%',
      justifyContent: 'space-between',
    },
    countPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.accent, 0.22),
      backgroundColor: withOpacity(ppcColors.accent, 0.1),
      alignItems: 'center',
      minWidth: 108,
    },
    countNumber: {
      color: ppcColors.accent,
      fontSize: 13,
      fontWeight: '900',
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    countLabel: {
      color: ppcColors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
    },
    list: {
      paddingHorizontal: 14,
      paddingBottom: 28,
      paddingTop: 2,
      gap: 12,
    },
    columnWrapper: {
      gap: 12,
    },
    itemWrapper: {
      flex: 1,
    },
    addButton: {
      width: 52,
      height: 52,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: withOpacity(ppcColors.accent, 0.32),
      backgroundColor: ppcColors.accent,
      shadowColor: ppcColors.accent,
      shadowOpacity: 0.28,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 16,
      elevation: 5,
    },
    skeletonWrap: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 2,
      paddingBottom: 24,
      gap: 12,
    },
    skeletonCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    skeletonHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    skeletonCircle: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: ppcColors.cardBgSoft,
      borderWidth: 1,
      borderColor: ppcColors.border,
      marginRight: 10,
    },
    skeletonTitleWrap: {
      flex: 1,
      gap: 8,
    },
    skeletonLine: {
      borderRadius: 999,
      backgroundColor: ppcColors.cardBgSoft,
      borderWidth: 1,
      borderColor: ppcColors.border,
      height: 12,
    },
    skeletonLineLong: {
      width: '68%',
    },
    skeletonLineShort: {
      width: '44%',
      height: 10,
    },
    skeletonPillsRow: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 8,
    },
    skeletonPill: {
      height: 28,
      borderRadius: 999,
      backgroundColor: ppcColors.cardBgSoft,
      borderWidth: 1,
      borderColor: ppcColors.border,
      width: 78,
    },
    skeletonPillWide: {
      width: 112,
    },
    skeletonFooterRow: {
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: ppcColors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skeletonTag: {
      width: 86,
      height: 22,
      borderRadius: 999,
      backgroundColor: ppcColors.cardBgSoft,
      borderWidth: 1,
      borderColor: ppcColors.border,
    },
    skeletonAction: {
      width: 138,
      height: 28,
      borderRadius: 999,
      backgroundColor: ppcColors.cardBgSoft,
      borderWidth: 1,
      borderColor: ppcColors.border,
    },
  });

export default DisplaysPage;
