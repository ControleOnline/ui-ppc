import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, useWindowDimensions, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InOut from './Status/InOut';
import Working from './Status/Working';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const DisplayProducts = ({ display = {} }) => {
    const route = useRoute();
    const { width } = useWindowDimensions();
    const displayId = decodeURIComponent(
        route.params?.id ||
        (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('id') || ''
            : '')
    );

    const peopleStore = useStore('people');
    const displayQueueStore = useStore('display_queues');
    const { ppcColors } = usePpcTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: displayQueueActions } = displayQueueStore;

    const [loaded, setLoaded] = useState({});
    const [statusIn, setStatusIn] = useState(null);
    const [statusWorking, setStatusWorking] = useState(null);
    const [statusOut, setStatusOut] = useState(null);

    const [orders, setOrders] = useState({
        status_in: [],
        status_working: [],
        status_out: [],
    });

    const [totals, setTotals] = useState({
        status_in: 0,
        status_working: 0,
        status_out: 0,
    });

    const getResponsiveItemsPerPage = () => {
        if (width > 1024) return 6;
        if (width > 480) return 4;
        return 1;
    };

    const getMyOrders = async (key, statusIds, rows) => {
        if (!statusIds.length) {
            setTotals(prev => ({ ...prev, [key]: 0 }));
            setOrders(prev => ({ ...prev, [key]: [] }));
            setLoaded(prev => ({ ...prev, [key]: true }));
            return;
        }

        try {
            const response = await api.fetch('order_product_queues', {
                params: {
                    status: [...new Set(statusIds)],
                    itemsPerPage: rows,
                    'order_product.order.provider': currentCompany?.id,
                },
            });

            setTotals(prev => ({
                ...prev,
                [key]: Number(response?.totalItems) || 0,
            }));

            setOrders(prev => ({
                ...prev,
                [key]: Array.isArray(response?.member) ? response.member : [],
            }));
        } finally {
            setLoaded(prev => ({ ...prev, [key]: true }));
        }
    };

    const onRequest = async () => {
        setOrders({ status_in: [], status_working: [], status_out: [] });
        setTotals({ status_in: 0, status_working: 0, status_out: 0 });
        setLoaded({});

        const rows = getResponsiveItemsPerPage();
        const result = await displayQueueActions.getItems({ display: displayId });

        const inIds = [];
        const workingIds = [];
        const outIds = [];

        (Array.isArray(result) ? result : []).forEach(item => {
            if (item.queue.status_in) {
                inIds.push(item.queue.status_in.id);
                setStatusIn(item.queue.status_in);
            }
            if (item.queue.status_working) {
                workingIds.push(item.queue.status_working.id);
                setStatusWorking(item.queue.status_working);
            }
            if (item.queue.status_out) {
                outIds.push(item.queue.status_out.id);
                setStatusOut(item.queue.status_out);
            }
        });

        await Promise.all([
            getMyOrders('status_in', inIds, rows),
            getMyOrders('status_working', workingIds, rows),
            getMyOrders('status_out', outIds, rows),
        ]);
    };

    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return;
            onRequest();
        }, [currentCompany])
    );

    const displayAccent =
      display?.displayType === 'orders' ? ppcColors.accentInfo : ppcColors.accent;
    const displayTypeLabel = String(display?.displayType || 'products').toUpperCase();
    const displayName = String(display?.display || 'Display');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryIconWrap}>
                        <MaterialCommunityIcons
                            name={display?.displayType === 'orders' ? 'receipt-text' : 'silverware-fork-knife'}
                            size={18}
                            color={displayAccent}
                        />
                    </View>
                    <View style={styles.summaryTitleWrap}>
                        <Text numberOfLines={1} style={styles.summaryTitle}>{displayName}</Text>
                    </View>
                </View>

                <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStatPill}>
                        <Text style={styles.summaryStatLabel}>Fila</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_in}</Text>
                    </View>
                    <View style={styles.summaryStatPill}>
                        <Text style={styles.summaryStatLabel}>Prep</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_working}</Text>
                    </View>
                    <View style={styles.summaryStatPill}>
                        <Text style={styles.summaryStatLabel}>Pronto</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_out}</Text>
                    </View>
                </View>

                <View style={styles.summaryFooter}>
                    <View style={styles.summaryTypePill}>
                        <Text style={[styles.summaryTypeText, { color: displayAccent }]}>
                            {displayTypeLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loaded.status_in && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_in.length > 0 ? (
                            orders.status_in.map((order, index) => (
                                <View key={index} style={{ width }}>
                                    <InOut
                                        orders={[order]}
                                        total={totals.status_in}
                                        status_in={statusIn}
                                        status_working={statusWorking}
                                        onReload={onRequest}
                                    />
                                </View>
                            ))
                        ) : (
                            <View style={{ width }}>
                                <InOut
                                    orders={[]}
                                    total={totals.status_in}
                                    status_in={statusIn}
                                    status_working={statusWorking}
                                    onReload={onRequest}
                                />
                            </View>
                        )}
                    </ScrollView>
                )}

                {loaded.status_working && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_working.length > 0 ? (
                            orders.status_working.map((order, index) => (
                                <View key={index} style={{ width }}>
                                    <Working
                                        orders={[order]}
                                        total={totals.status_working}
                                        status_working={statusWorking}
                                        status_out={statusOut}
                                        onReload={onRequest}
                                    />
                                </View>
                            ))
                        ) : (
                            <View style={{ width }}>
                                <Working
                                    orders={[]}
                                    total={totals.status_working}
                                    status_working={statusWorking}
                                    status_out={statusOut}
                                    onReload={onRequest}
                                />
                            </View>
                        )}
                    </ScrollView>
                )}

                {loaded.status_out && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_out.length > 0 ? (
                            orders.status_out.map((order, index) => (
                                <View key={index} style={{ width }}>
                                    <InOut
                                        orders={[order]}
                                        total={totals.status_out}
                                        status_in={statusOut}
                                        onReload={onRequest}
                                    />
                                </View>
                            ))
                        ) : (
                            <View style={{ width }}>
                                <InOut
                                    orders={[]}
                                    total={totals.status_out}
                                    status_in={statusOut}
                                    onReload={onRequest}
                                />
                            </View>
                        )}
                    </ScrollView>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (ppcColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        summaryCard: {
            marginHorizontal: 12,
            marginTop: 8,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 10,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.cardBg,
        },
        summaryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        summaryIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
        },
        summaryTitleWrap: {
            flex: 1,
        },
        summaryTitle: {
            color: ppcColors.textPrimary,
            fontSize: 30,
            lineHeight: 34,
            fontWeight: '900',
        },
        summaryStatsRow: {
            marginTop: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        summaryStatPill: {
            flex: 1,
            marginHorizontal: 3,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            paddingVertical: 5,
            alignItems: 'center',
        },
        summaryStatLabel: {
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
        },
        summaryStatValue: {
            color: ppcColors.textPrimary,
            fontSize: 21,
            lineHeight: 24,
            fontWeight: '900',
            marginTop: 2,
        },
        summaryFooter: {
            marginTop: 10,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            borderTopWidth: 1,
            borderTopColor: withOpacity(ppcColors.border, 0.7),
            paddingTop: 8,
        },
        summaryTypePill: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.panelBg,
            paddingHorizontal: 10,
            paddingVertical: 3,
        },
        summaryTypeText: {
            fontSize: 10,
            letterSpacing: 0.8,
            fontWeight: '800',
        },
        content: {
            paddingTop: 4,
            paddingBottom: 8,
            backgroundColor: ppcColors.appBg,
            minHeight: '100%',
        },
    });

export default DisplayProducts;
