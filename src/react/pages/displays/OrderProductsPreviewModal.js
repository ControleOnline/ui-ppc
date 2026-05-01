import React, { useMemo } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import OrderItemsTab from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderItemsTab';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
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
    display = null,
    onClose = null,
    ppcColorsOverride = null,
}) => {
    const insets = useSafeAreaInsets();
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const { styles: orderDetailsStyles } = useOrderDetailsVisuals();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const orderId = useMemo(() => getOrderRouteId(order), [order]);
    const orderProducts = useMemo(
        () => resolveEmbeddedOrderProducts(order),
        [order?.orderProducts],
    );
    const displayId = display?.id || null;

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
                        <View style={orderDetailsStyles.topBarInlineWrap}>
                            <Text style={styles.eyebrow}>Pedido completo</Text>

                            <View style={orderDetailsStyles.topBarHeaderRowStacked}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={orderDetailsStyles.topBarBackButton}
                                >
                                    <Icon name="close" size={20} color={ppcColors.textPrimary} />
                                </TouchableOpacity>

                                <View style={orderDetailsStyles.topBarHeaderContentStacked}>
                                    <View style={orderDetailsStyles.topBarHeaderSectionStacked}>
                                        <OrderHeader order={order} isKds />
                                    </View>
                                </View>
                            </View>

                            <View style={orderDetailsStyles.topBarActionSectionStacked}>
                                <View style={orderDetailsStyles.topBarActionsStacked}>
                                    <PrintButton
                                        job={{ type: 'order', orderId }}
                                        store="orders"
                                        compact
                                        layout={{ variant: 'icon' }}
                                        iconColor={ppcColors.accentInfo}
                                        compactButtonStyle={orderDetailsStyles.topBarIconButton}
                                        compactSelectStyle={orderDetailsStyles.topBarIconButton}
                                        printerSelection={{
                                            enabled: true,
                                            context: 'display',
                                            display,
                                            displayId,
                                        }}
                                        disabled={!orderId}
                                    />
                                </View>
                            </View>
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
                                variant="main"
                            />
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default OrderProductsPreviewModal;
