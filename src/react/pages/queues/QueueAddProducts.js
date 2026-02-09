import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, List, IconButton, TextInput } from 'react-native-paper';
import { useStore } from '@store';

export default function QueueAddProducts({ route }) {
    const { queue } = route.params || {};

    const productsStore = useStore('products');
    const peopleStore = useStore('people');

    const { getters: peopleGetters } = peopleStore;
    const { getters: productsGetters, actions: productActions } = productsStore;

    const { currentCompany } = peopleGetters;
    const { items } = productsGetters;

    const [search, setSearch] = useState('');

    useFocusEffect(
        useCallback(() => {
            if (currentCompany) {
                productActions.getItems({
                    company: currentCompany.id,
                });
            }
        }, [currentCompany]),
    );

    const queueProducts = useMemo(
        () => items?.filter(p => p.queue?.id === queue?.id) || [],
        [items, queue],
    );

    const availableProducts = useMemo(
        () =>
            items?.filter(
                p =>
                    !p.queue &&
                    p.product?.toLowerCase().includes(search.toLowerCase()),
            ) || [],
        [items, search],
    );

    const addToQueue = product => {
        productActions.save({
            id: product.id,
            queue: `/queues/${queue.id}`,
        });
    };

    const removeFromQueue = product => {
        productActions.save({
            id: product.id,
            queue: null,
        });
    };

    return (
        <View style={styles.container}>
            <Text variant="titleLarge">{queue.queue}</Text>

            <TextInput
                label="Adicionar produto"
                value={search}
                onChangeText={setSearch}
                style={styles.input}
            />

            {!!search && (
                <FlatList
                    data={availableProducts}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => (
                        <List.Item
                            title={item.product}
                            onPress={() => {
                                addToQueue(item);
                                setSearch('');
                            }}
                        />
                    )}
                />
            )}

            <Text variant="titleMedium" style={styles.section}>
                Produtos na fila
            </Text>

            <FlatList
                data={queueProducts}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                    <List.Item
                        title={item.product}
                        right={() => (
                            <IconButton
                                icon="close"
                                onPress={() => removeFromQueue(item)}
                            />
                        )}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    input: { marginVertical: 12 },
    section: { marginTop: 16 },
});
