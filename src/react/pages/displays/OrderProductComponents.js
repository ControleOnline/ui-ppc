import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useStore } from '@store';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

const DEFAULT_GROUP_KEY = 'default-group';

const normalizeText = value => String(value || '').trim();
const getProductCategoryLabel = product =>
    normalizeText(
        product?.product?.category?.name ||
        product?.product?.category?.category ||
        product?.category?.name ||
        product?.category?.category ||
        product?.product?.productCategory?.category?.name ||
        product?.product?.productCategory?.category?.category ||
        product?.product?.productCategories?.[0]?.category?.name ||
        product?.product?.productCategories?.[0]?.category?.category ||
        product?.productCategory?.category?.name ||
        product?.productCategory?.category?.category ||
        product?.product?.categoryName ||
        '',
    );

const getProductGroupLabel = product =>
    normalizeText(
        product?.productGroup?.productGroup ||
        product?.productGroup?.name ||
        product?.productGroupName ||
        product?.groupName ||
        '',
    );

const getProductBucketLabel = product =>
    getProductCategoryLabel(product) || getProductGroupLabel(product) || 'Outros';

const getProductBucketKey = product =>
    normalizeText(
        product?.product?.category?.id ||
        product?.product?.category?.['@id'] ||
        product?.category?.id ||
        product?.category?.['@id'] ||
        product?.product?.productCategory?.category?.id ||
        product?.product?.productCategory?.category?.['@id'] ||
        product?.product?.productCategories?.[0]?.category?.id ||
        product?.product?.productCategories?.[0]?.category?.['@id'] ||
        product?.productCategory?.category?.id ||
        product?.productCategory?.category?.['@id'] ||
        getProductBucketLabel(product),
    ) || DEFAULT_GROUP_KEY;

const formatQuantity = value => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return '1';
    }

    return Number.isInteger(numericValue)
        ? String(numericValue)
        : String(numericValue).replace('.', ',');
};

const groupProducts = products => {
    const groupedMap = (Array.isArray(products) ? products : []).reduce(
        (currentGroups, product) => {
            const groupId = String(getProductBucketKey(product));
            const groupLabel = getProductBucketLabel(product);

            if (!currentGroups[groupId]) {
                currentGroups[groupId] = {
                    id: groupId,
                    label: groupLabel,
                    products: [],
                };
            }

            currentGroups[groupId].products.push(product);
            return currentGroups;
        },
        {},
    );

    return Object.values(groupedMap);
};

const OrderProductComponents = ({ order_product, ppcColorsOverride = null }) => {
    const store = useStore('order_products');
    const { actions } = store;
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const [groups, setGroups] = useState([]);
    const embeddedProducts = useMemo(
        () =>
            Array.isArray(order_product?.orderProductComponents)
                ? order_product.orderProductComponents
                : Array.isArray(order_product?.order_product_components)
                    ? order_product.order_product_components
                    : [],
        [order_product?.orderProductComponents, order_product?.order_product_components],
    );

    useEffect(() => {
        let cancelled = false;

        if (!order_product) {
            setGroups([]);
            return undefined;
        }

        if (embeddedProducts.length > 0) {
            setGroups(groupProducts(embeddedProducts));
            return undefined;
        }

        const onRequest = async () => {
            const filter = {
                order: order_product.order?.['@id'] || order_product.order?.id,
                parentProduct: order_product.product?.['@id'] || order_product.product?.id,
                orderProduct: order_product['@id'] || order_product.id,
            };

            try {
                const products = await actions.getItems(filter);

                if (!cancelled) {
                    setGroups(groupProducts(products));
                }
            } catch {
                if (!cancelled) {
                    setGroups([]);
                }
            }
        };

        onRequest();

        return () => {
            cancelled = true;
        };
    }, [
        actions,
        embeddedProducts,
        order_product?.id,
        order_product?.['@id'],
        order_product?.order?.id,
        order_product?.order?.['@id'],
        order_product?.product?.id,
        order_product?.product?.['@id'],
    ]);

    if (!groups.length) {
        return null;
    }

    return (
        <View style={styles.wrap}>
            {groups.map(group => (
                <View key={group.id} style={styles.groupWrap}>
                    {!!group.label && (
                        <Text style={styles.groupLabel}>{group.label}</Text>
                    )}

                    {group.products.map(product => {
                        const comment = normalizeText(product?.comment);

                        return (
                            <View key={product.id || `${group.id}-${product?.product?.id}`} style={styles.itemWrap}>
                                <Text style={styles.itemLine}>
                                    {formatQuantity(product?.quantity)}x{' '}
                                    {product?.product?.product}
                                </Text>
                                {!!comment && (
                                    <Text style={styles.commentLine}>
                                        OBS: {comment}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

const createStyles = ppcColors =>
    StyleSheet.create({
        wrap: {
            paddingHorizontal: 16,
            paddingBottom: 4,
        },
        groupWrap: {
            marginBottom: 8,
        },
        groupLabel: {
            marginBottom: 4,
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        itemWrap: {
            marginBottom: 4,
        },
        itemLine: {
            color: ppcColors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            lineHeight: 18,
        },
        commentLine: {
            marginTop: 2,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 17,
        },
    });

export default OrderProductComponents;
