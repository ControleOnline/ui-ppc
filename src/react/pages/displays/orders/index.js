import React, { useCallback, useMemo } from 'react'
import {
    FlatList,
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { useStore } from '@store'

const Orders = () => {
    const { width } = useWindowDimensions()

    const peopleStore = useStore('people')
    const queuesStore = useStore('queues')

    const { currentCompany } = peopleStore.getters
    const { getters, actions } = queuesStore
    const { items: orders } = getters

    const columns = useMemo(() => {
        if (width >= 1800) return 6
        if (width >= 1400) return 5
        if (width >= 1100) return 4
        if (width >= 800) return 3
        return 1
    }, [width])

    const scale = useMemo(() => {
        if (width >= 1800) return 0.85
        if (width >= 1400) return 0.9
        return 0.95
    }, [width])

    const styles = useMemo(() => createStyles(scale), [scale])

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

    const getItemColor = (order, product) => {
        const queue = product.orderProductQueues?.[0]
        if (queue?.status?.color) return queue.status.color
        if (order.status?.color) return order.status.color
        return '#333'
    }

    const buildHierarchyByGroup = products => {
        const roots = []
        let currentRoot = null
        let currentCustom = null

        products.forEach(p => {
            const node = { ...p, children: [] }

            if (!p.productGroup) {
                roots.push(node)
                currentRoot = node
                currentCustom = null
                return
            }

            if (currentCustom) {
                currentCustom.children.push(node)
                return
            }

            if (currentRoot) {
                currentRoot.children.push(node)
            }

            if (p.product?.type === 'custom') {
                currentCustom = node
            }
        })

        return roots
    }

    const renderNode = (order, node, level = 0) => (
        <View key={node.id}>
            <View
                style={[
                    styles.itemRow,
                    {
                        marginLeft: level * 14 * scale,
                        borderLeftColor: getItemColor(order, node),
                    },
                ]}
            >
                <Text style={level === 0 ? styles.text : styles.subText}>
                    {node.quantity} x {node.product.product}
                </Text>
            </View>

            {node.children.map(child =>
                renderNode(order, child, level + 1)
            )}
        </View>
    )

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <FlatList
                data={orders}
                key={columns}
                numColumns={columns}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const hierarchy = buildHierarchyByGroup(
                        item.orderProducts || []
                    )

                    return (
                        <View style={styles.card}>
                            <View style={styles.header}>
                                <Text style={styles.title}>#{item.id}</Text>
                                <Text style={styles.app}>{item.app}</Text>
                            </View>

                            {hierarchy.map(node =>
                                renderNode(item, node)
                            )}
                        </View>
                    )
                }}
            />
        </SafeAreaView>
    )
}

const createStyles = scale =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#0e0e0e',
        },
        list: {
            padding: 6 * scale,
        },
        card: {
            flex: 1,
            backgroundColor: '#1a1a1a',
            padding: 8 * scale,
            margin: 4 * scale,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#2a2a2a',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6 * scale,
        },
        title: {
            color: '#fff',
            fontSize: 12 * scale,
            fontWeight: '700',
        },
        app: {
            color: '#19afbd',
            fontSize: 10 * scale,
            fontWeight: '600',
        },
        itemRow: {
            marginTop: 4 * scale,
            paddingLeft: 6 * scale,
            borderLeftWidth: 4,
        },
        text: {
            color: '#fff',
            fontSize: 11 * scale,
        },
        subText: {
            color: '#aaa',
            fontSize: 9 * scale,
        },
    })

export default Orders
