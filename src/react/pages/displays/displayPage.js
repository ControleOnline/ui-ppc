import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  useWindowDimensions,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';
import AppearanceToggle from '@controleonline/ui-ppc/src/react/components/AppearanceToggle';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png');
const parseEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/);
    if (iriMatch?.[1]) return Number(iriMatch[1]);
    return null;
  }
  if (typeof value.id === 'number') return value.id;
  if (typeof value.id === 'string') return parseEntityId(value.id);
  if (value['@id']) return parseEntityId(String(value['@id']));
  return null;
};

const DisplaysPage = () => {
  const { width } = useWindowDimensions();
  const displaysStore = useStore('displays');
  const displayQueuesStore = useStore('display_queues');
  const peopleStore = useStore('people');
  const navigation = useNavigation();

  const { actions, items, isLoading, error } = displaysStore;
  const { actions: displayQueuesActions } = displayQueuesStore;
  const { currentCompany } = peopleStore.getters;
  const [displayQueuesRows, setDisplayQueuesRows] = useState([]);
  const { ppcColors, isDark, toggleAppearanceMode } = usePpcTheme();
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const numColumns = useMemo(() => {
    if (width >= 1700) return 4;
    if (width >= 1260) return 3;
    if (width >= 760) return 2;
    return 1;
  }, [width]);
  const isCompact = width < 920;

  const refreshDisplays = useCallback(async () => {
    if (!currentCompany?.id) return;
    const displays = await actions.getItems({ company: currentCompany.id });
    const displayIds = (Array.isArray(displays) ? displays : [])
      .map((row) => parseEntityId(row?.id || row?.['@id'] || row))
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
      const displayId = parseEntityId(row?.display?.id || row?.display?.['@id'] || row?.display);
      return displayId && displayIds.includes(displayId);
    });
    setDisplayQueuesRows(filtered);
  }, [actions, currentCompany?.id, displayQueuesActions]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplays();
    }, [refreshDisplays])
  );

  const prefetchedByDisplay = useMemo(() => {
    const grouped = {};
    (Array.isArray(displayQueuesRows) ? displayQueuesRows : []).forEach((row) => {
      const displayId = parseEntityId(row?.display?.id || row?.display?.['@id'] || row?.display);
      if (!displayId) return;
      if (!grouped[displayId]) grouped[displayId] = [];
      grouped[displayId].push(row);
    });
    return grouped;
  }, [displayQueuesRows]);

  const openDisplay = useCallback(
    (item) => {
      navigation.navigate('DisplayDetails', { id: item.id });
    },
    [navigation]
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
          onPress={() => openDisplay(item)}
          onLinked={refreshDisplays}
          editable={env.APP_TYPE === 'MANAGER'}
        />
      </View>
    ),
    [openDisplay, prefetchedByDisplay, refreshDisplays]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="displays" />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={[styles.heroTopRow, isCompact && styles.heroTopRowCompact]}>
          <View style={styles.heroIdentity}>
            <View style={styles.heroLogoWrap}>
              <Image source={BRAND_LOGO} style={styles.heroLogo} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.heroTitle}>Painel PPC</Text>
              <Text style={styles.heroSubtitle}>
                {currentCompany?.alias || currentCompany?.person || 'Empresa'} · Displays ativos
              </Text>
            </View>
          </View>
          <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
            <AppearanceToggle isDark={isDark} onToggle={toggleAppearanceMode} ppcColors={ppcColors} />
            <View style={styles.countPill}>
              <Text style={styles.countNumber}>{items?.length || 0}</Text>
              <Text style={styles.countLabel}>displays</Text>
            </View>
            {env.APP_TYPE === 'MANAGER' && (
              <Pressable style={styles.addButton} onPress={addDisplay}>
                <Text style={styles.addButtonText}>+ Adicionar Display</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {!isLoading && !error && (
        <FlatList
          key={`cols-${numColumns}`}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : null}
          contentContainerStyle={styles.list}
        />
      )}
      {isLoading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ppcColors.accent} />
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (ppcColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ppcColors.appBg,
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: ppcColors.panelBg,
    borderWidth: 1,
    borderColor: ppcColors.border,
    borderTopWidth: 2,
    borderTopColor: ppcColors.accent,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: ppcColors.border,
    opacity: 0.5,
  },
  heroTopRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  heroTopRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ppcColors.borderSoft,
    backgroundColor: ppcColors.pillTextDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 28,
    height: 28,
  },
  heroTitle: {
    color: ppcColors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    marginTop: 2,
    color: ppcColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  heroActionsCompact: {
    width: '100%',
    justifyContent: 'space-between',
  },
  countPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ppcColors.accent,
    backgroundColor: ppcColors.panelBg,
    alignItems: 'center',
    minWidth: 76,
  },
  countNumber: {
    color: ppcColors.accent,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  countLabel: {
    color: ppcColors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
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
    backgroundColor: ppcColors.panelBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ppcColors.border,
  },
  addButtonText: {
    color: ppcColors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DisplaysPage;
