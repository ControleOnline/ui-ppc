import React, { useState, useCallback } from 'react';
import { SafeAreaView, View, useWindowDimensions, ScrollView } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import InOut from './Status/InOut';
import Working from './Status/Working';

const DisplayDetails = () => {
    const route = useRoute();
    const { width } = useWindowDimensions();
    const display = decodeURIComponent(route.params?.id);

    const peopleStore = useStore('people');
    const orderQueueStore = useStore('order_products_queue');
    const displayQueueStore = useStore('display_queues');

    const { currentCompany } = peopleStore.getters;
    const { getters, actions: orderActions } = orderQueueStore;
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
            setLoaded(prev => ({ ...prev, [key]: true }));
            return;
        }

        const result = await orderActions.getItems({
            status: statusIds,
            itemsPerPage: rows,
            'order_product.order.provider': currentCompany?.id,
        });

        setTotals(prev => ({
            ...prev,
            [key]: getters.totalItems ?? 0,
        }));

        setOrders(prev => ({
            ...prev,
            [key]: Array.isArray(result) ? result : [],
        }));

        setLoaded(prev => ({ ...prev, [key]: true }));
    };

    const onRequest = async () => {
        setOrders({ status_in: [], status_working: [], status_out: [] });
        setLoaded({});

        const rows = getResponsiveItemsPerPage();
        const result = await displayQueueActions.getItems({ display });

        const inIds = [];
        const workingIds = [];
        const outIds = [];

        result.forEach(item => {
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
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView>
                {loaded.status_in && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_in.map((order, index) => (
                            <View key={index} style={{ width }}>
                                <InOut
                                    orders={[order]}
                                    total={totals.status_in}
                                    status_in={statusIn}
                                    status_working={statusWorking}
                                    onReload={onRequest}
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}

                {loaded.status_working && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_working.map((order, index) => (
                            <View key={index} style={{ width }}>
                                <Working
                                    orders={[order]}
                                    total={totals.status_working}
                                    status_working={statusWorking}
                                    status_out={statusOut}
                                    onReload={onRequest}
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}

                {loaded.status_out && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {orders.status_out.map((order, index) => (
                            <View key={index} style={{ width }}>
                                <InOut
                                    orders={[order]}
                                    total={totals.status_out}
                                    status_in={statusOut}
                                    onReload={onRequest}
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default DisplayDetails;