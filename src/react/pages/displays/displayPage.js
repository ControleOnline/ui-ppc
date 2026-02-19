import React, { useCallback, useMemo } from 'react';
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
import { env } from '@env';

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png');

const DisplaysPage = () => {
  const { width } = useWindowDimensions();
  const displaysStore = useStore('displays');
  const peopleStore = useStore('people');
  const navigation = useNavigation();

  const { actions, items, isLoading, error } = displaysStore;
  const { currentCompany } = peopleStore.getters;

  const numColumns = useMemo(() => {
    if (width >= 1700) return 4;
    if (width >= 1260) return 3;
    if (width >= 760) return 2;
    return 1;
  }, [width]);
  const isCompact = width < 920;

  const refreshDisplays = useCallback(() => {
    if (!currentCompany?.id) return;
    actions.getItems({ company: currentCompany.id });
  }, [actions, currentCompany?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplays();
    }, [refreshDisplays])
  );

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
          onPress={() => openDisplay(item)}
          onLinked={refreshDisplays}
          editable={env.APP_TYPE === 'MANAGER'}
        />
      </View>
    ),
    [openDisplay, refreshDisplays]
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
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060A11',
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderTopWidth: 2,
    borderTopColor: '#FACC15',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#1E293B',
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
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 28,
    height: 28,
  },
  heroTitle: {
    color: '#F1F5F9',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    marginTop: 2,
    color: '#94A3B8',
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
    borderColor: '#FACC15',
    backgroundColor: '#0C1219',
    alignItems: 'center',
    minWidth: 76,
  },
  countNumber: {
    color: '#FACC15',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  countLabel: {
    color: '#E2E8F0',
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
    backgroundColor: '#0C1219',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  addButtonText: {
    color: '#FACC15',
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
