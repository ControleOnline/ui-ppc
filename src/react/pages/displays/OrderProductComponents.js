import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import createStyles from './OrderProductComponents.styles';
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

const resolveEmbeddedProducts = orderProduct => {
    const candidates = [
        orderProduct?.orderProductComponents,
        orderProduct?.order_product_components,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }

        if (Array.isArray(candidate?.member)) {
            return candidate.member;
        }

        if (Array.isArray(candidate?.['hydra:member'])) {
            return candidate['hydra:member'];
        }
    }

    return [];
};

const OrderProductComponents = ({ order_product, ppcColorsOverride = null }) => {
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const embeddedProducts = useMemo(
        () => resolveEmbeddedProducts(order_product),
        [order_product?.orderProductComponents, order_product?.order_product_components],
    );
    const groups = useMemo(
        () => groupProducts(embeddedProducts),
        [embeddedProducts],
    );

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

export default OrderProductComponents;
