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
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme'
import { withOpacity } from '@controleonline/../../src/styles/branding'

const Orders = ({ display = {} }) => {
    const route = useRoute()
    const navigation = useNavigation()
    const { width } = useWindowDimensions()
    const peopleStore = useStore('people');
    const queuesStore = useStore('queues')
    const { getters, actions } = queuesStore
    const { items, totalItems, isLoading } = getters
    const displayId = decodeURIComponent(route.params?.id || '')
    const [orders, setOrders] = useState([])
    const { currentCompany } = peopleStore.getters;
    const { ppcColors } = usePpcTheme()

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
        if (!displayId || !currentCompany) return
        actions.ordersQueue({
            status: { realStatus: ['open'] },
            provider: currentCompany?.id
        }).then((data) => {
            setOrders(data);
        })
    }, [displayId])

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
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryIdentity}>
                        <View style={styles.summaryIconWrap}>
                            <MaterialCommunityIcons
                                name={display?.displayType === 'products' ? 'silverware-fork-knife' : 'receipt-text'}
                                size={18}
                                color={display?.displayType === 'products' ? ppcColors.accent : ppcColors.accentInfo}
                            />
                        </View>
                        <View style={styles.summaryTitleWrap}>
                            <Text numberOfLines={1} style={styles.summaryTitle}>
                                {String(display?.display || 'Display')}
                            </Text>
                            <Text style={styles.summarySubtitle}>Pedidos na fila</Text>
                        </View>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={ppcColors.accent}
                            style={styles.loader}
                        />
                    ) : (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{totalItems || 0}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.summaryFooter}>
                    <View style={styles.summaryTypePill}>
                        <Text
                            style={[
                                styles.summaryTypeText,
                                { color: display?.displayType === 'products' ? ppcColors.accent : ppcColors.accentInfo },
                            ]}
                        >
                            {String(display?.displayType || 'orders').toUpperCase()}
                        </Text>
                    </View>
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
                        <OrderHeader order={item} compact />
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
        summaryCard: {
            marginHorizontal: 12 * scale,
            marginTop: 10 * scale,
            marginBottom: 10 * scale,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.cardBg,
            paddingHorizontal: 12 * scale,
            paddingTop: 10 * scale,
            paddingBottom: 10 * scale,
        },
        summaryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        summaryIdentity: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        summaryIconWrap: {
            width: 36 * scale,
            height: 36 * scale,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10 * scale,
        },
        summaryTitleWrap: {
            flex: 1,
        },
        summaryTitle: {
            color: ppcColors.textPrimary,
            fontSize: 24 * scale,
            lineHeight: 28 * scale,
            fontWeight: '900',
        },
        summarySubtitle: {
            color: ppcColors.textSecondary,
            fontSize: 12 * scale,
            fontWeight: '600',
            marginTop: 2 * scale,
        },
        summaryFooter: {
            marginTop: 8 * scale,
            borderTopWidth: 1,
            borderTopColor: withOpacity(ppcColors.border, 0.7),
            paddingTop: 8 * scale,
        },
        summaryTypePill: {
            alignSelf: 'flex-start',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.panelBg,
            paddingHorizontal: 10 * scale,
            paddingVertical: 3 * scale,
        },
        summaryTypeText: {
            fontSize: 10 * scale,
            letterSpacing: 0.8 * scale,
            fontWeight: '800',
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
