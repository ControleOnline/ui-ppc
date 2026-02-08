import React, { useCallback, useMemo } from 'react'
import {
    View,
    FlatList,
    Pressable,
    useWindowDimensions,
    StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Card, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useStore } from '@store'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'

const iconByType = {
    products: 'silverware-fork-knife',
    orders: 'receipt-text',
    'products x orders': 'clipboard-check-outline',
}

const DisplaysPage = ({ navigation }) => {
    const { width } = useWindowDimensions()
    const displaysStore = useStore('displays')
    const peopleStore = useStore('people')
    const { actions, items, isLoading, error } = displaysStore
    const { currentCompany } = peopleStore.getters

    const numColumns = useMemo(() => {
        if (width >= 1600) return 4
        if (width >= 1200) return 3
        if (width >= 800) return 2
        return 1
    }, [width])

    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return
            actions.getItems({ company: currentCompany.id })
        }, [currentCompany])
    )

    const openDisplay = item => {
        navigation.navigate('DisplayDetails', { id: item.id })
    }

    const renderQueue = queue => (
        <View key={queue.id} style={styles.queueBlock}>
            <Text style={styles.queueTitle}>{queue.queue}</Text>
            {queue.status_in && (
                <Text style={styles.statusText}>{queue.status_in.status}</Text>
            )}
            {queue.status_working && (
                <Text style={styles.statusText}>
                    {queue.status_working.status}
                </Text>
            )}
            {queue.status_out && (
                <Text style={styles.statusText}>{queue.status_out.status}</Text>
            )}
        </View>
    )

    const renderItem = ({ item }) => (
        <View style={styles.itemWrapper}>
            <Pressable
                onPress={() => openDisplay(item)}
                style={({ pressed }) => [
                    styles.cardPressable,
                    pressed && styles.cardPressed,
                ]}
            >
                <Card style={styles.displayCard}>
                    <Card.Content style={styles.cardContent}>
                        <MaterialCommunityIcons
                            name={iconByType[item.displayType] || 'monitor'}
                            size={44}
                            color="#F5C542"
                        />

                        <Text style={styles.displayTitle}>{item.display}</Text>
                        <Text style={styles.displayType}>
                            ({item.displayType})
                        </Text>

                        <View style={styles.queuesWrapper}>
                            {item.displayQueue?.map(dq =>
                                renderQueue(dq.queue)
                            )}
                        </View>
                    </Card.Content>
                </Card>
            </Pressable>
        </View>
    )

    return (
        <SafeAreaView style={styles.container}>
            <StateStore store="displays" />
            {!isLoading && !error && (
                <FlatList
                    key={`cols-${numColumns}`}
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => String(item.id)}
                    numColumns={numColumns}
                    columnWrapperStyle={
                        numColumns > 1 ? styles.columnWrapper : null
                    }
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    )
}

export default DisplaysPage

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

    cardPressable: {
        flex: 1,
    },

    cardPressed: {
        opacity: 0.9,
    },

    displayCard: {
        flex: 1,
        minHeight: 240,
        borderRadius: 18,
        backgroundColor: '#1F1F2B',
        elevation: 5,
    },

    cardContent: {
        alignItems: 'center',
        paddingVertical: 22,
    },

    displayTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },

    displayType: {
        fontSize: 13,
        color: '#B0B0B0',
        marginBottom: 12,
    },

    queuesWrapper: {
        width: '100%',
        alignItems: 'center',
        marginTop: 6,
    },

    queueBlock: {
        alignItems: 'center',
        marginTop: 10,
    },

    queueTitle: {
        backgroundColor: '#F5C542',
        color: '#000000',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 14,
        marginBottom: 6,
        fontSize: 13,
        fontWeight: '600',
    },

    statusText: {
        fontSize: 13,
        color: '#E0E0E0',
        marginVertical: 1,
        textAlign: 'center',
    },
})
