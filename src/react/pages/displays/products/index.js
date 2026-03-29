import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    useWindowDimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InOut from './Status/InOut';
import Working from './Status/Working';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';

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
    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: displayQueueActions } = displayQueueStore;

    const [loaded, setLoaded] = useState({});
    const [statusIn, setStatusIn] = useState(null);
    const [statusWorking, setStatusWorking] = useState(null);
    const [statusOut, setStatusOut] = useState(null);
    const store = useStore('order_products_queue');
    const { actions, getters } = store;
    const { isSaving } = getters;
    const [modalType, setModalType] = useState(null); // 'in' | 'out' | null

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


    useEffect(() => {
        const autoStart = async () => {

            if (isSaving) return;
            if (!loaded.status_working) return;
            if (!loaded.status_in) return;
            if (!orders.status_in.length) return;
            if (totals.status_working >= 5) return;
            if (totals.status_in == 0) return;

            const needed = 5 - totals.status_working;
            const ordersToStart = orders.status_in.slice(0, needed);
            for (const order of ordersToStart) {
                await actions.save({
                    id: order.id,
                    status: statusWorking['@id'],
                }).then(() => {
                    totals.status_in = 0;
                });
            }

            if (ordersToStart.length > 0) {
                await onRequest();
            }
        };
        autoStart();
    }, [orders]);

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

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryStatsRow}>
                    <TouchableOpacity
                        style={styles.summaryStatPill}
                        onPress={() => setModalType('in')}
                    >
                        <Text style={styles.summaryStatLabel}>Fila</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_in}</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryStatPill}>
                        <Text style={styles.summaryStatLabel}>Prep</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_working}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.summaryStatPill}
                        onPress={() => setModalType('out')}
                    >
                        <Text style={styles.summaryStatLabel}>Pronto</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_out}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 🔥 SOMENTE WORKING */}
            <ScrollView contentContainerStyle={styles.content}>
                {loaded.status_working && (
                    <Working
                        orders={orders.status_working}
                        total={totals.status_working}
                        status_working={statusWorking}
                        status_out={statusOut}
                        ppcColorsOverride={ppcColors}
                        onReload={onRequest}
                    />
                )}
            </ScrollView>

            {/* 🔥 MODAL (IN / OUT) */}
            <Modal visible={!!modalType} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setModalType(null)}>
                        <Text style={styles.closeButton}>Fechar</Text>
                    </TouchableOpacity>

                    {modalType === 'in' && (
                        <InOut
                            orders={orders.status_in}
                            total={totals.status_in}
                            status_in={statusIn}
                            status_working={statusWorking}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}

                    {modalType === 'out' && (
                        <InOut
                            orders={orders.status_out}
                            total={totals.status_out}
                            status_in={statusOut}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}
                </SafeAreaView>
            </Modal>
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
            margin: 12,
            padding: 10,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.cardBg,
        },
        summaryStatsRow: {
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
            paddingVertical: 10,
            alignItems: 'center',
        },
        summaryStatLabel: {
            fontSize: 11,
            fontWeight: '700',
        },
        summaryStatValue: {
            fontSize: 22,
            fontWeight: '900',
        },
        content: {
            padding: 10,
        },
        modalContainer: {
            flex: 1,
            padding: 10,
            backgroundColor: ppcColors.appBg,
        },
        closeButton: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
        },
    });

export default DisplayProducts;