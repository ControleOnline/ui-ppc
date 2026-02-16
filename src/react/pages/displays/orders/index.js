import React, { useCallback, useMemo } from 'react'
import {
    FlatList,
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
    Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import { useStore } from '@store'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'


const Orders = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { width } = useWindowDimensions()

    const queuesStore = useStore('queues')
    const { getters, actions } = queuesStore
    const { items: orders } = getters
    const display = decodeURIComponent(route.params?.id || '')

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
            if (display) {
                actions.ordersQueue({
                    status: 104,
                })
            }
        }, [display])
    )

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
                            navigation.navigate('OrderDetails', { order: item })
                        }
                    >
                        <OrderHeader order={item} showControls={false} />
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
