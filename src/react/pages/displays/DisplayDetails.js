import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ProductsDisplay from './products';
import OrdersDisplay from './orders';
import { useStore } from '@store';

const DisplayDetails = () => {
    const route = useRoute();
    const displayId = decodeURIComponent(route.params?.id);

    const displayQueueStore = useStore('displays');
    const { actions, getters } = displayQueueStore;
    const { item: display } = getters;


    useEffect(() => {
        if (displayId)
            actions.get(displayId);

    }, [displayId]);

    if (display.displayType === 'products') {
        return <ProductsDisplay display={display} />;
    }

    if (display.displayType === 'orders' || display.displayType === 'tv') {
        return <OrdersDisplay display={display} />;
    }

    return <View />;
};

export default DisplayDetails;
