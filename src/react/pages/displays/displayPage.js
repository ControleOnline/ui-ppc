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
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';
import { env } from '@env';
import { colors as fallbackColors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png');

const buildDisplayTheme = (palette = {}, themeColors = {}) => {
  const accent = themeColors['ppc-accent'] || palette.primary || '#FACC15';
  const secondaryAccent =
    themeColors['ppc-accent-info'] || palette.secondary || '#38BDF8';

  return {
    appBg: palette.background || '#F8FAFC',
    panelBg: themeColors['ppc-panel-bg-light'] || '#FFFFFF',
    cardBg: themeColors['ppc-card-bg-light'] || '#FFFFFF',
    cardBgSoft:
      themeColors['ppc-card-bg-soft-light'] || withOpacity(accent, 0.07),
    modalBg: themeColors['ppc-modal-bg'] || '#FFFFFF',
    textPrimary:
      themeColors['ppc-text-primary-light'] || palette.text || '#0F172A',
    textSecondary:
      themeColors['ppc-text-secondary-light'] ||
      palette.textSecondary ||
      '#475569',
    textDark: themeColors['ppc-text-dark'] || palette.text || '#0F172A',
    border:
      themeColors['ppc-border-light'] ||
      withOpacity(palette.primary || accent, 0.16),
    borderSoft:
      themeColors['ppc-border-soft-light'] ||
      withOpacity(palette.primary || accent, 0.3),
    overlay: themeColors['ppc-overlay-light'] || 'rgba(15,23,42,0.32)',
    accent,
    accentInfo: secondaryAccent,
    danger: themeColors['ppc-danger'] || '#EF4444',
    dangerBg: themeColors['ppc-danger-bg-light'] || '#FFF1F2',
    dangerText: themeColors['ppc-danger-text'] || '#DC2626',
    pillTextDark: themeColors['ppc-pill-text-dark-light'] || '#0F172A',
    primary: palette.primary || accent,
    mode: 'light',
    isLight: true,
    isDark: false,
  };
};

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
  const themeStore = useStore('theme');
  const navigation = useNavigation();

  const { actions, items, isLoading, error } = displaysStore;
  const { actions: displayQueuesActions } = displayQueuesStore;
  const { currentCompany } = peopleStore.getters;
  const themeColors = themeStore?.getters?.colors || {};
  const [displayQueuesRows, setDisplayQueuesRows] = useState([]);

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        fallbackColors,
      ),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

  const ppcColors = useMemo(
    () =>
      buildDisplayTheme(brandColors, {
        ...themeColors,
        ...(currentCompany?.theme?.colors || {}),
      }),
    [brandColors, currentCompany?.id, currentCompany?.theme?.colors, themeColors],
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
      const displayId = parseEntityId(
        row?.display?.id || row?.display?.['@id'] || row?.display,
      );
      return displayId && displayIds.includes(displayId);
    });
    setDisplayQueuesRows(filtered);
  }, [actions, currentCompany?.id, displayQueuesActions]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplays();
    }, [refreshDisplays]),
  );

  const prefetchedByDisplay = useMemo(() => {
    const grouped = {};
    (Array.isArray(displayQueuesRows) ? displayQueuesRows : []).forEach((row) => {
      const displayId = parseEntityId(
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
      navigation.navigate('DisplayDetails', { id: item.id });
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
      <StateStore store="displays" />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={[styles.heroTopRow, isCompact && styles.heroTopRowCompact]}>
          <View style={styles.heroIdentity}>
            <View style={styles.heroLogoWrap}>
              <Image source={BRAND_LOGO} style={styles.heroLogo} resizeMode="contain" />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Painel PPC</Text>
              <Text style={styles.heroSubtitle}>Gestao de displays para operacao mobile.</Text>
            </View>
          </View>

          <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
            <View style={styles.countPill}>
              <Text style={styles.countNumber}>{items?.length || 0} ativos</Text>
              <Text style={styles.countLabel}>
                {currentCompany?.alias || currentCompany?.person || 'Empresa atual'}
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
    loaderWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default DisplaysPage;
