import React, { useCallback } from 'react'
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useStore } from '@store'

const Orders = () => {
    const peopleStore = useStore('people')
    const queuesStore = useStore('queues')

    const { currentCompany } = peopleStore.getters
    const { getters, actions } = queuesStore
    const { items: orders } = getters

    useFocusEffect(
        useCallback(() => {
            if (currentCompany?.id) {
                actions.ordersQueue({
                    provider: currentCompany.id,
                    status: 104,
                })
            }
        }, [currentCompany?.id])
    )

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {orders.map(order => (
                    <View key={order.id} style={styles.card}>
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                Pedido #{order.id}
                            </Text>
                            <Text style={styles.app}>{order.app}</Text>
                        </View>

                        <Text style={styles.total}>
                            Total: R$ {order.price}
                        </Text>

                        {(order.orderProducts || []).map(item => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.text}>
                                        {item.product.product}
                                    </Text>
                                    <Text style={styles.subText}>
                                        {item.quantity} x R$ {item.price}
                                    </Text>
                                </View>

                                <View style={styles.statusContainer}>
                                    {(item.orderProductQueues || []).map(queue => (
                                        queue.status && (
                                            <View
                                                key={queue.id}
                                                style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: queue.status.color },
                                                ]}
                                            >
                                                <Text style={styles.statusText}>
                                                    {queue.status.status}
                                                </Text>
                                            </View>
                                        )
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    card: {
        backgroundColor: '#1e1e1e',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    app: {
        color: '#19afbd',
        fontSize: 12,
        fontWeight: '600',
    },
    total: {
        color: '#bbb',
        marginTop: 4,
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    itemInfo: {
        flex: 1,
    },
    text: {
        color: '#fff',
        fontSize: 14,
    },
    subText: {
        color: '#aaa',
        fontSize: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginLeft: 8,
        justifyContent: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '600',
    },
})

export default Orders
