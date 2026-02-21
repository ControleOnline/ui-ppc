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
import AppearanceToggle from '@controleonline/ui-ppc/src/react/components/AppearanceToggle'
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme'

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
    const { ppcColors, isDark, toggleAppearanceMode } = usePpcTheme()

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

    const styles = useMemo(() => createStyles(scale, ppcColors), [scale, ppcColors])

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
                    <AppearanceToggle
                        isDark={isDark}
                        onToggle={toggleAppearanceMode}
                        ppcColors={ppcColors}
                        compact
                    />
                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={ppcColors.accent}
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

const createStyles = (scale, ppcColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16 * scale,
            paddingVertical: 12 * scale,
            backgroundColor: ppcColors.panelBg,
            borderBottomWidth: 1,
            borderBottomColor: ppcColors.border,
        },
        headerTitle: {
            color: ppcColors.textPrimary,
            fontSize: 22 * scale,
            fontWeight: '900',
        },
        headerRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10 * scale,
        },
        badge: {
            minWidth: 50 * scale,
            paddingHorizontal: 14 * scale,
            paddingVertical: 6 * scale,
            borderRadius: 999,
            backgroundColor: ppcColors.accent,
            alignItems: 'center',
        },
        badgeText: {
            color: ppcColors.textDark,
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
            backgroundColor: ppcColors.cardBg,
            padding: 10 * scale,
            margin: 5 * scale,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: ppcColors.border,
            minHeight: 260 * scale,
        },
        itemRow: {
            marginTop: 6 * scale,
            paddingVertical: 5 * scale,
            paddingLeft: 8 * scale,
            borderLeftWidth: 5,
            borderRadius: 10,
            backgroundColor: ppcColors.cardBgSoft,
        },
        text: {
            color: ppcColors.textPrimary,
            fontSize: 16 * scale,
            fontWeight: '700',
        },
        subText: {
            color: ppcColors.textSecondary,
            fontSize: 13 * scale,
            fontWeight: '500',
        },
        qtyText: {
            color: ppcColors.accent,
            fontWeight: '900',
        },
        statusMarker: {
            fontWeight: '900',
        },
    })

export default Orders
