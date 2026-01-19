import React, { useEffect, useCallback } from 'react';
import { SafeAreaView, View, FlatList, Image } from 'react-native';
import { useStore } from '@store';
import { useFocusEffect } from '@react-navigation/native';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { Card, Text, Button } from 'react-native-paper';
import css from '@controleonline/ui-orders/src/react/css/orders';

const DisplaysPage = ({ navigation }) => {
    const { styles } = css();
    const displaysStore = useStore('displays');
    const peopleStore = useStore('people');
    const { actions, items, isLoading, error } = displaysStore;
    const { currentCompany } = peopleStore.getters;

    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return;
            actions.getItems({ company: currentCompany.id });
        }, [currentCompany])
    );

    const openDisplay = item => {
        navigation.navigate('DisplayDetails', { id: item.id });
    };

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.row}>
                    {item.company?.file ? (
                        <Image
                            source={{ uri: item.company.file }}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text>{item.company?.alias}</Text>
                    )}
                </View>

                <Text style={styles.title}>{item.display}</Text>
                <Text style={styles.subtitle}>{item.displayType}</Text>
            </Card.Content>

            <Card.Actions>
                <Button mode="contained" onPress={() => openDisplay(item)}>
                    Abrir
                </Button>
            </Card.Actions>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StateStore store="displays" />
            {!isLoading && !error && (
                <FlatList
                    data={items}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
};

export default DisplaysPage;
