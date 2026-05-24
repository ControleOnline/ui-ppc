import React, { useMemo } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar';
import OrderItemsTab from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderItemsTab';
import { getOrderRouteId } from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import createStyles from './OrderProductsPreviewModal.styles';

const resolveEmbeddedOrderProducts = order => {
    if (Array.isArray(order?.orderProducts)) {
        return order.orderProducts;
    }

    if (Array.isArray(order?.orderProducts?.member)) {
        return order.orderProducts.member;
    }

    if (Array.isArray(order?.orderProducts?.['hydra:member'])) {
        return order.orderProducts['hydra:member'];
    }

    return [];
};

const OrderProductsPreviewModal = ({
    visible = false,
    order = null,
    onClose = null,
    display = null,
    displayId = null,
    ppcColorsOverride = null,
}) => {
    const insets = useSafeAreaInsets();
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const orderId = useMemo(() => getOrderRouteId(order), [order]);
    const orderProducts = useMemo(
        () => resolveEmbeddedOrderProducts(order),
        [order?.orderProducts],
    );
    const printerSelection = useMemo(
        () => ({
            enabled: true,
            context: 'display',
            display,
            displayId: display?.id || displayId || undefined,
        }),
        [display, displayId],
    );

    if (!visible || !orderId) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="overFullScreen"
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.backdropTouch}
                    onPress={onClose}
                />

                <View style={styles.container}>
                    <View
                        style={[
                            styles.sheet,
                            { paddingBottom: Math.max(insets?.bottom || 0, 12) },
                        ]}
                    >
                        <View style={styles.headerWrap}>
                            <OrderStackedTopBar
                                order={order}
                                isKds
                                onBackPress={onClose}
                                showBackButton
                                backIconName="close"
                                buttons={['print']}
                                printJob={{
                                    type: 'order',
                                    orderId,
                                }}
                                printerSelection={printerSelection}
                            />
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <OrderItemsTab
                                addProductsButtonLabel=""
                                canAddProductsToOrder={false}
                                onAddProduct={() => {}}
                                order={order}
                                orderProducts={orderProducts}
                                routeOrderId={orderId}
                                showPricing={false}
                                showRootQuantityPrefix
                                showQueuePresentation
                            />
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default OrderProductsPreviewModal;
