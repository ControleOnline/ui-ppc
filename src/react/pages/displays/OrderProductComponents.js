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
const orderProductDetailsCache = new Map();
const pendingOrderProductRequests = new Map();

const getHydraCollection = value => {
    if (Array.isArray(value)) {
        return value;
    }

    if (Array.isArray(value?.member)) {
        return value.member;
    }

    if (Array.isArray(value?.['hydra:member'])) {
        return value['hydra:member'];
    }

    return null;
};

const normalizeEntityId = value => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (/^\d+$/.test(trimmedValue)) {
            return Number(trimmedValue);
        }

        const iriMatch = trimmedValue.match(/\/(\d+)(?:\/)?$/);
        if (iriMatch?.[1]) {
            return Number(iriMatch[1]);
        }

        return null;
    }

    if (typeof value?.id === 'number') {
        return value.id;
    }

    if (typeof value?.id === 'string') {
        return normalizeEntityId(value.id);
    }

    if (value?.['@id']) {
        return normalizeEntityId(value['@id']);
    }

    return null;
};

const mergeNestedEntity = (baseEntity, nextEntity) => {
    if (!baseEntity || typeof baseEntity !== 'object') {
        return nextEntity;
    }

    if (!nextEntity || typeof nextEntity !== 'object') {
        return baseEntity;
    }

    return {
        ...baseEntity,
        ...nextEntity,
    };
};

const resolveCollectionValue = (...candidates) => {
    for (const candidate of candidates) {
        const collectionItems = getHydraCollection(candidate);
        if (collectionItems) {
            return collectionItems;
        }
    }

    return null;
};

const mergeOrderProduct = (baseOrderProduct, detailedOrderProduct) => {
    if (!detailedOrderProduct || typeof detailedOrderProduct !== 'object') {
        return baseOrderProduct;
    }

    const mergedOrderProduct = {
        ...baseOrderProduct,
        ...detailedOrderProduct,
        order: mergeNestedEntity(baseOrderProduct?.order, detailedOrderProduct?.order),
        product: mergeNestedEntity(baseOrderProduct?.product, detailedOrderProduct?.product),
        category: mergeNestedEntity(baseOrderProduct?.category, detailedOrderProduct?.category),
        productGroup: mergeNestedEntity(
            baseOrderProduct?.productGroup,
            detailedOrderProduct?.productGroup,
        ),
        productCategory: mergeNestedEntity(
            baseOrderProduct?.productCategory,
            detailedOrderProduct?.productCategory,
        ),
    };

    const orderProductComponents = resolveCollectionValue(
        detailedOrderProduct?.orderProductComponents,
        detailedOrderProduct?.order_product_components,
        baseOrderProduct?.orderProductComponents,
        baseOrderProduct?.order_product_components,
    );
    if (orderProductComponents) {
        mergedOrderProduct.orderProductComponents = orderProductComponents;
        mergedOrderProduct.order_product_components = orderProductComponents;
    }

    const orderProductQueues = resolveCollectionValue(
        detailedOrderProduct?.orderProductQueues,
        detailedOrderProduct?.order_product_queues,
        baseOrderProduct?.orderProductQueues,
        baseOrderProduct?.order_product_queues,
    );
    if (orderProductQueues) {
        mergedOrderProduct.orderProductQueues = orderProductQueues;
        mergedOrderProduct.order_product_queues = orderProductQueues;
    }

    const productFiles = resolveCollectionValue(
        detailedOrderProduct?.product?.productFiles,
        detailedOrderProduct?.product?.product_files,
        detailedOrderProduct?.product?.files,
        baseOrderProduct?.product?.productFiles,
        baseOrderProduct?.product?.product_files,
        baseOrderProduct?.product?.files,
    );
    if (productFiles) {
        mergedOrderProduct.product = {
            ...(mergedOrderProduct.product || {}),
            productFiles,
            product_files: productFiles,
            files: productFiles,
        };
    }

    return mergedOrderProduct;
};

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

    return (
        <View style={styles.wrap}>
            <OrderProducts
                order={resolvedOrderProduct?.order || order_product?.order || null}
                orderProducts={[resolvedOrderProduct]}
                styles={productStyles}
                showDetails
                showPricing={false}
                showImages
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
