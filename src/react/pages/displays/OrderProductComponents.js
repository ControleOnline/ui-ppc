import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from '@controleonline/ui-common/src/api';
import OrderProducts from '@controleonline/ui-orders/src/react/components/OrderProducts';
import {
    hasDetailedOrderProductMetadata,
    needsDetailedOrderProductsFetch,
} from '@controleonline/ui-orders/src/react/utils/orderProductsFetchPolicy';
import createStyles from './OrderProductComponents.styles';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
const {
    mergeOrderProduct,
    normalizeEntityId,
    shouldWaitForCompletePayload,
} = require('@controleonline/ui-ppc/src/react/utils/orderProductMerge');

const orderProductDetailsCache = new Map();
const pendingOrderProductRequests = new Map();

const cacheDetailedOrderProduct = orderProduct => {
    const orderProductId = normalizeEntityId(orderProduct?.id || orderProduct?.['@id']);
    if (!orderProductId || !orderProduct || typeof orderProduct !== 'object') {
        return orderProduct;
    }

    orderProductDetailsCache.set(String(orderProductId), orderProduct);
    return orderProduct;
};

const loadDetailedOrderProduct = async orderProductId => {
    const cacheKey = String(orderProductId);
    if (orderProductDetailsCache.has(cacheKey)) {
        return orderProductDetailsCache.get(cacheKey);
    }

    if (pendingOrderProductRequests.has(cacheKey)) {
        return pendingOrderProductRequests.get(cacheKey);
    }

    const request = api.fetch(`order_products/${orderProductId}`)
        .then(response => {
            pendingOrderProductRequests.delete(cacheKey);
            if (!response || typeof response !== 'object') {
                return null;
            }

            return cacheDetailedOrderProduct(response);
        })
        .catch(error => {
            pendingOrderProductRequests.delete(cacheKey);
            throw error;
        });

    pendingOrderProductRequests.set(cacheKey, request);
    return request;
};

const OrderProductComponents = ({ order_product, ppcColorsOverride = null }) => {
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const orderProductId = useMemo(
        () => normalizeEntityId(order_product?.id || order_product?.['@id']),
        [order_product?.['@id'], order_product?.id],
    );
    const [detailedOrderProduct, setDetailedOrderProduct] = useState(() =>
        orderProductId
            ? orderProductDetailsCache.get(String(orderProductId)) || null
            : null,
    );
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        if (!orderProductId) {
            setDetailedOrderProduct(null);
            return;
        }

        if (hasDetailedOrderProductMetadata([order_product])) {
            cacheDetailedOrderProduct(order_product);
        }

        setDetailedOrderProduct(
            orderProductDetailsCache.get(String(orderProductId)) || null,
        );
    }, [orderProductId, order_product]);

    const shouldFetchDetails = useMemo(
        () =>
            Boolean(orderProductId) &&
            Boolean(order_product) &&
            needsDetailedOrderProductsFetch([order_product]),
        [orderProductId, order_product],
    );

    useEffect(() => {
        if (!orderProductId || !shouldFetchDetails) {
            setIsLoadingDetails(false);
            return undefined;
        }

        const cachedOrderProduct = orderProductDetailsCache.get(String(orderProductId));
        if (cachedOrderProduct && hasDetailedOrderProductMetadata([cachedOrderProduct])) {
            setDetailedOrderProduct(cachedOrderProduct);
            setIsLoadingDetails(false);
            return undefined;
        }

        let cancelled = false;
        setIsLoadingDetails(true);

        loadDetailedOrderProduct(orderProductId)
            .then(fetchedOrderProduct => {
                if (cancelled || !fetchedOrderProduct) {
                    return;
                }

                setDetailedOrderProduct(fetchedOrderProduct);
            })
            .catch(() => null)
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingDetails(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [orderProductId, shouldFetchDetails]);

    const resolvedOrderProduct = useMemo(
        () => mergeOrderProduct(order_product, detailedOrderProduct),
        [detailedOrderProduct, order_product],
    );
    const productStyles = useMemo(
        () => ({
            itemRow: styles.itemRow,
            itemMainRow: styles.itemMainRow,
            itemLead: styles.itemLead,
            itemThumbWrap: styles.itemThumbWrap,
            itemThumbImage: styles.itemThumbImage,
            itemThumbPlaceholder: styles.itemThumbPlaceholder,
            itemThumbPlaceholderText: styles.itemThumbPlaceholderText,
            itemContent: styles.itemContent,
            metaWrap: styles.metaWrap,
            queueBadge: styles.queueBadge,
            queueBadgeDot: styles.queueBadgeDot,
            queueBadgeText: styles.queueBadgeText,
            itemActions: styles.itemActions,
            priceRow: styles.priceRow,
            text: styles.text,
            subText: styles.subText,
            qtyText: styles.qtyText,
            statusMarker: styles.statusMarker,
            groupWrap: styles.groupWrap,
            groupTitlePill: styles.groupTitlePill,
            groupTitle: styles.groupTitle,
            groupItem: styles.groupItem,
            groupItemMainRow: styles.groupItemMainRow,
            groupItemContent: styles.groupItemContent,
            groupItemMetaWrap: styles.groupItemMetaWrap,
            groupItemActions: styles.groupItemActions,
            groupItemText: styles.groupItemText,
            groupItemMetaText: styles.groupItemMetaText,
            groupItemPriceText: styles.groupItemPriceText,
        }),
        [styles],
    );

    if (!resolvedOrderProduct) {
        return null;
    }

    // Acceptance (ui-ppc#4): never render a knowingly incomplete tree.
    // When details are required and still loading without detailed metadata, show loading only.
    const hasDetailedMetadata = hasDetailedOrderProductMetadata([resolvedOrderProduct]);
    const waitingForCompletePayload = shouldWaitForCompletePayload(
        shouldFetchDetails,
        isLoadingDetails,
        hasDetailedMetadata,
    );

    if (waitingForCompletePayload) {
        return (
            <View style={styles.wrap}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={ppcColors.accent} />
                    <Text style={styles.loadingText}>Carregando detalhes...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <OrderProducts
                order={resolvedOrderProduct?.order || order_product?.order || null}
                orderProducts={[resolvedOrderProduct]}
                styles={productStyles}
                showDetails
                showPricing={false}
                showImages
                showRootQuantityPrefix={false}
                showQueuePresentation={false}
            />

            {isLoadingDetails && shouldFetchDetails ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={ppcColors.accent} />
                    <Text style={styles.loadingText}>Carregando detalhes...</Text>
                </View>
            ) : null}
        </View>
    );
};

export default OrderProductComponents;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
