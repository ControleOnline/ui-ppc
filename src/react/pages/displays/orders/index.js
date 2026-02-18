import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
    FlatList,
    View,
    StyleSheet,
    useWindowDimensions,
    Pressable,
    Text,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useStore } from '@store'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'
import KDSOrderHeader from '@controleonline/ui-ppc/src/react/components/KDSOrderHeader'

const Orders = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { width } = useWindowDimensions()
    const peopleStore = useStore('people');
    const queuesStore = useStore('queues')
    const { getters, actions } = queuesStore
    const { items, totalItems, isLoading } = getters
    const display = decodeURIComponent(route.params?.id || '')
    const [orders, setOrders] = useState([])
    const { currentCompany } = peopleStore.getters;

    const columns = useMemo(() => {
        if (width >= 2200) return 5
        if (width >= 1700) return 4
        if (width >= 1300) return 3
        if (width >= 900) return 2
        return 1
    }, [width])

    const scale = useMemo(() => {
        if (width >= 2200) return 1.15
        if (width >= 1700) return 1.05
        if (width >= 1300) return 0.97
        return 0.92
    }, [width])

    const styles = useMemo(() => createStyles(scale), [scale])

    const fetchOrders = useCallback(() => {
        if (!display || !currentCompany) return
        actions.ordersQueue({
            status: { realStatus: ['open'] },
            provider: currentCompany?.id
        }).then((data) => {
            setOrders(data);
        })
    }, [display])

    useFocusEffect(
        useCallback(() => {
            fetchOrders()
        }, [fetchOrders, currentCompany])
    )

    useFocusEffect(
        useCallback(() => {
            if (items && items.length)
                setOrders(items)
        }, [items])
    )

    useEffect(() => {
        if (totalItems > 0 && display.displayType == 'orders') return

        const interval = setInterval(() => {
            fetchOrders()
        }, 15000)

        return () => clearInterval(interval)
    }, [totalItems, fetchOrders])

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pedidos na fila</Text>

                <View style={styles.headerRight}>
                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color="#FACC15"
                            style={styles.loader}
                        />
                    ) : <View style={styles.badge}>
                        <Text style={styles.badgeText}>{totalItems || 0}</Text>
                    </View>}
                </View>
            </View>

            <FlatList
                data={orders}
                key={columns}
                numColumns={columns}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.card}
                        onPress={() =>
                            navigation.navigate('OrderDetails', { order: item, kds: true })
                        }
                    >
                        <KDSOrderHeader order={item} compact />
                        <OrderProducts
                            order={item}
                            scale={scale}
                            styles={styles}
                        />
                    </Pressable>
                )}
            />
        </SafeAreaView>
    )
}

const createStyles = scale =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#060A11',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16 * scale,
            paddingVertical: 12 * scale,
            backgroundColor: '#0B1220',
            borderBottomWidth: 1,
            borderBottomColor: '#1E293B',
        },
        headerTitle: {
            color: '#F8FAFC',
            fontSize: 22 * scale,
            fontWeight: '900',
        },
        headerRight: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        badge: {
            minWidth: 50 * scale,
            paddingHorizontal: 14 * scale,
            paddingVertical: 6 * scale,
            borderRadius: 999,
            backgroundColor: '#FACC15',
            alignItems: 'center',
        },
        badgeText: {
            color: '#000',
            fontSize: 18 * scale,
            fontWeight: '900',
        },
        loader: {
            marginLeft: 10 * scale,
        },
        list: {
            padding: 8 * scale,
        },
        card: {
            flex: 1,
            backgroundColor: '#0D141D',
            padding: 10 * scale,
            margin: 5 * scale,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#1E293B',
            minHeight: 260 * scale,
        },
        itemRow: {
            marginTop: 6 * scale,
            paddingVertical: 5 * scale,
            paddingLeft: 8 * scale,
            borderLeftWidth: 5,
            borderRadius: 10,
            backgroundColor: '#101927',
        },
        text: {
            color: '#F8FAFC',
            fontSize: 16 * scale,
            fontWeight: '700',
        },
        subText: {
            color: '#CBD5E1',
            fontSize: 13 * scale,
            fontWeight: '500',
        },
        qtyText: {
            color: '#FACC15',
            fontWeight: '900',
        },
        statusMarker: {
            fontWeight: '900',
        },
    })

export default Orders
