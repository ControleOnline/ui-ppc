import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, List, IconButton, TextInput } from 'react-native-paper';
import { useStore } from '@store';
import AppearanceToggle from '@controleonline/ui-ppc/src/react/components/AppearanceToggle';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

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
    const { ppcColors, isDark, toggleAppearanceMode } = usePpcTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

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
            <View style={styles.titleRow}>
                <Text variant="headlineSmall" style={styles.title}>{queueName}</Text>
                <AppearanceToggle isDark={isDark} onToggle={toggleAppearanceMode} ppcColors={ppcColors} compact />
            </View>
            {!queueId && (
                <Text style={styles.errorText}>Fila inválida. Volte e selecione a fila novamente.</Text>
            )}

            <TextInput
                label="Adicionar produto"
                value={search}
                onChangeText={setSearch}
                style={styles.input}
                textColor={ppcColors.textPrimary}
                outlineColor={ppcColors.border}
                activeOutlineColor={ppcColors.accent}
                theme={{ colors: { onSurfaceVariant: ppcColors.textSecondary } }}
                editable={!!queueId}
                mode="outlined"
            />

            {!!search && !!queueId && (
                <FlatList
                    data={availableProducts}
                    keyExtractor={item => String(item.id)}
                    style={styles.searchList}
                    renderItem={({ item }) => (
                        <List.Item
                            title={item.product}
                            titleStyle={styles.listItemTitle}
                            style={styles.searchListItem}
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
                    style={styles.queueList}
                    renderItem={({ item }) => (
                        <List.Item
                            title={item.product}
                            titleStyle={styles.listItemTitle}
                            style={styles.queueListItem}
                            right={() => (
                                <IconButton
                                    icon="close"
                                    onPress={() => removeFromQueue(item)}
                                    iconColor={ppcColors.dangerText}
                                    containerColor={ppcColors.dangerBg}
                                />
                            )}
                        />
                    )}
                />
            )}
        </View>
    );
}

const createStyles = (ppcColors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 14,
        backgroundColor: ppcColors.appBg,
    },
    title: {
        color: ppcColors.textPrimary,
        fontWeight: '900',
    },
    titleRow: {
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    input: { marginVertical: 12, backgroundColor: ppcColors.cardBg },
    section: {
        marginTop: 16,
        color: ppcColors.textSecondary,
        fontWeight: '800',
    },
    errorText: { marginTop: 8, color: ppcColors.dangerText, fontWeight: '700' },
    searchList: {
        maxHeight: 220,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ppcColors.border,
        backgroundColor: ppcColors.cardBg,
    },
    searchListItem: {
        borderBottomWidth: 1,
        borderBottomColor: ppcColors.border,
    },
    queueList: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ppcColors.border,
        backgroundColor: ppcColors.cardBg,
    },
    queueListItem: {
        borderBottomWidth: 1,
        borderBottomColor: ppcColors.border,
    },
    listItemTitle: {
        color: ppcColors.textPrimary,
        fontWeight: '700',
    },
});
