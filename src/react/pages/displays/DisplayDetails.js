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
    const { actions: orderActions } = orderQueueStore;
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

    const getResponsiveItemsPerPage = () => {
        if (width > 1024) return 6;
        if (width > 480) return 4;
        return 1;
    };

    const getMyOrders = async (status, statusIds, rows) => {
        if (!statusIds.length) return;

        try {
            const result = await orderActions.getItems({
                status: statusIds,
                itemsPerPage: rows,
                'order_product.order.provider': currentCompany?.id,
            });

            setOrders(prev => ({
                ...prev,
                [status]: result,
            }));
        } finally {
            setLoaded(prev => ({ ...prev, [status]: true }));
        }
    };

    const onRequest = async () => {
        setOrders({ status_in: [], status_working: [], status_out: [] });
        setLoaded({});

        const rows = getResponsiveItemsPerPage();
        const result = await displayQueueActions.getItems({ display });

        const statusInIds = [];
        const statusWorkingIds = [];
        const statusOutIds = [];

        result.forEach(item => {
            statusInIds.push(item.queue.status_in?.id);
            statusWorkingIds.push(item.queue.status_working?.id);
            statusOutIds.push(item.queue.status_out?.id);

            setStatusIn(item.queue.status_in);
            setStatusWorking(item.queue.status_working);
            setStatusOut(item.queue.status_out);
        });

        await Promise.all([
            getMyOrders('status_in', statusInIds, rows),
            getMyOrders('status_working', statusWorkingIds, rows),
            getMyOrders('status_out', statusOutIds, rows),
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
