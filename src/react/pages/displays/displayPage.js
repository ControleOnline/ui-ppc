import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import DisplayCard from '@controleonline/ui-ppc/src/react/components/DisplayCard';

const DisplaysPage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const displaysStore = useStore('displays');
  const peopleStore = useStore('people');

  const { actions, items, isLoading, error } = displaysStore;
  const { currentCompany } = peopleStore.getters;

  const numColumns = useMemo(() => {
    if (width >= 1600) return 4;
    if (width >= 1200) return 3;
    if (width >= 800) return 2;
    return 1;
  }, [width]);

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) return;
      actions.getItems({ company: currentCompany.id });
    }, [currentCompany?.id, actions])
  );

  const openDisplay = useCallback(
    (item) => {
      navigation.navigate('DisplayDetails', { id: item.id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.itemWrapper}>
        <DisplayCard item={item} onPress={() => openDisplay(item)} />
      </View>
    ),
    [openDisplay]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="displays" />

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECEFF1',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  itemWrapper: {
    flex: 1,
  },
});

export default DisplaysPage;