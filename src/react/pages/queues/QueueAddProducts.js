import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, List, IconButton, TextInput } from 'react-native-paper';
import { useStore } from '@store';

export default function QueueAddProducts({ route }) {
    const params = route.params || {};
    const queueId = Number(params.queueId || params.queue?.id || params.queue || 0) || null;
    const queueName = params.queueName || params.queue?.queue || (queueId ? `Fila #${queueId}` : 'Fila');

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
        () => items?.filter(p => Number(p.queue?.id) === Number(queueId)) || [],
        [items, queueId],
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
        if (!queueId) return;
        productActions.save({
            id: product.id,
            queue: `/queues/${queueId}`,
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
            <Text variant="titleLarge">{queueName}</Text>
            {!queueId && (
                <Text style={styles.errorText}>Fila inválida. Volte e selecione a fila novamente.</Text>
            )}

            <TextInput
                label="Adicionar produto"
                value={search}
                onChangeText={setSearch}
                style={styles.input}
                editable={!!queueId}
            />

            {!!search && !!queueId && (
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

            {!!queueId && (
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    input: { marginVertical: 12 },
    section: { marginTop: 16 },
    errorText: { marginTop: 8, color: '#B42318', fontWeight: '700' },
});
