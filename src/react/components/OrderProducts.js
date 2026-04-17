import React, { useMemo } from 'react'
import { View, Text } from 'react-native'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

import {
    inlineStyle_364_42,
    inlineStyle_385_38,
    inlineStyle_392_38,
    inlineStyle_410_74,
} from './OrderProducts.styles';

const normalizeText = value => String(value || '').trim()

const normalizeQuantity = value => {
    const numericValue = Number(value || 0)
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

const formatQuantityPrefix = value => {
    const quantity = normalizeQuantity(value)
    return quantity >= 2 ? `${quantity}x ` : ''
}

const toEntityId = value => {
    if (!value) return ''

    if (typeof value === 'object') {
        return normalizeText(value.id || value['@id'] || '').replace(/^.*\//, '')
    }

    return normalizeText(value).replace(/^.*\//, '')
}

const toMoney = value => {
    const amount = Number(value || 0)
    return Number.isFinite(amount) ? amount : 0
}

const OrderProducts = ({ order, styles, showDetails = false }) => {
    const getItemColor = (currentOrder, product) => {
        const queue = product?.orderProductQueues?.[0]
        if (queue?.status?.color) return queue.status.color
        if (currentOrder?.status?.color) return currentOrder.status.color
        return '#333'
    }

    const getNodeKey = node =>
        toEntityId(node?.id || node?.['@id'])

    const getNodeName = node =>
        normalizeText(
            node?.product?.name ||
            node?.product?.product ||
            node?.name ||
            node?.product?.description ||
            '',
        )

    const getNodeDescription = node =>
        normalizeText(node?.product?.description || node?.description || '')

    const getNodeObservation = node =>
        normalizeText(
            node?.comments ||
            node?.observation ||
            node?.observations ||
            node?.note ||
            node?.remark ||
            node?.product?.comments ||
            node?.product?.observations ||
            '',
        )

    const getCategoryLabel = node =>
        normalizeText(
            node?.product?.category?.name ||
            node?.product?.category?.category ||
            node?.category?.name ||
            node?.category?.category ||
            node?.product?.productCategory?.category?.name ||
            node?.product?.productCategory?.category?.category ||
            node?.product?.productCategories?.[0]?.category?.name ||
            node?.product?.productCategories?.[0]?.category?.category ||
            node?.productCategory?.category?.name ||
            node?.productCategory?.category?.category ||
            node?.product?.categoryName ||
            '',
        )

    const getGroupLabel = node =>
        normalizeText(
            node?.productGroup?.productGroup ||
            node?.productGroup?.name ||
            node?.productGroupName ||
            node?.groupName ||
            '',
        ) || 'Outros'

    const getChildBucketLabel = node =>
        getCategoryLabel(node) || getGroupLabel(node)

    const getParentReference = node =>
        node?.parentProduct || node?.productGroup?.parentProduct || null

    const getCatalogProductKey = node =>
        toEntityId(node?.product?.id || node?.product?.['@id'])

    const getParentCatalogProductKey = node =>
        toEntityId(
            node?.productGroup?.parentProduct?.id ||
            node?.productGroup?.parentProduct?.['@id'] ||
            node?.productGroup?.parentProduct,
        )

    const buildProductCards = products => {
        const items = Array.isArray(products) ? products : []
        const cards = []
        const cardsByRootKey = new Map()
        const cardsByCatalogProductKey = new Map()

        const registerCatalogProductCard = (card, catalogProductKey) => {
            if (!catalogProductKey) return

            if (!cardsByCatalogProductKey.has(catalogProductKey)) {
                cardsByCatalogProductKey.set(catalogProductKey, [])
            }

            cardsByCatalogProductKey.get(catalogProductKey).push(card)
        }

        const createCard = ({ cardKey, orderIndex, rootItem = null, name = '', description = '' }) => {
            const card = {
                key: cardKey,
                order: orderIndex,
                rootItem,
                rootKey: rootItem ? getNodeKey(rootItem) : '',
                rootProductKey: rootItem ? getCatalogProductKey(rootItem) : '',
                name: normalizeText(name),
                description: normalizeText(description),
                observation: '',
                quantity: 0,
                unitPrice: 0,
                totalPrice: 0,
                itemColor: getItemColor(order, rootItem || {}),
                groups: new Map(),
            }

            cards.push(card)
            cardsByRootKey.set(cardKey, card)
            registerCatalogProductCard(card, card.rootProductKey)

            return card
        }

        const getOrCreateRootCard = (item, index) => {
            const rootKey = getNodeKey(item) || `root-${index}`

            if (cardsByRootKey.has(rootKey)) {
                return cardsByRootKey.get(rootKey)
            }

            return createCard({
                cardKey: rootKey,
                orderIndex: index,
                rootItem: item,
                name: getNodeName(item) || `Item #${index + 1}`,
                description: getNodeDescription(item),
            })
        }

        const getFallbackCardForGroupedItem = (item, index) => {
            const parentReference = getParentReference(item)
            const fallbackKey = `group-${toEntityId(parentReference) || getParentCatalogProductKey(item) || index}`

            if (cardsByRootKey.has(fallbackKey)) {
                return cardsByRootKey.get(fallbackKey)
            }

            const fallbackRootProductKey =
                getParentCatalogProductKey(item) ||
                toEntityId(parentReference?.id || parentReference?.['@id'])

            const card = createCard({
                cardKey: fallbackKey,
                orderIndex: index,
                rootItem: null,
                name:
                    normalizeText(
                        parentReference?.product ||
                        parentReference?.name ||
                        item?.productGroup?.parentProduct?.product ||
                        item?.productGroup?.parentProduct?.name ||
                        '',
                    ) || `Item #${index + 1}`,
                description: normalizeText(
                    parentReference?.description ||
                    item?.productGroup?.parentProduct?.description ||
                    '',
                ),
            })

            if (fallbackRootProductKey) {
                card.rootProductKey = fallbackRootProductKey
                registerCatalogProductCard(card, fallbackRootProductKey)
            }

            return card
        }

        const resolveCardForGroupedItem = (item, index) => {
            const explicitParentKey = toEntityId(getParentReference(item))
            if (explicitParentKey && cardsByRootKey.has(explicitParentKey)) {
                return cardsByRootKey.get(explicitParentKey)
            }

            const parentCatalogProductKey = getParentCatalogProductKey(item)
            const productMatches = parentCatalogProductKey
                ? (cardsByCatalogProductKey.get(parentCatalogProductKey) || [])
                : []

            if (productMatches.length) {
                const nearestPreviousCard =
                    [...productMatches]
                        .filter(card => card.order <= index)
                        .sort((left, right) => right.order - left.order)[0] ||
                    productMatches[productMatches.length - 1]

                if (nearestPreviousCard) {
                    return nearestPreviousCard
                }
            }

            return getFallbackCardForGroupedItem(item, index)
        }

        items.forEach((item, index) => {
            if (item?.productGroup) return

            const card = getOrCreateRootCard(item, index)
            const quantity = Number(item?.quantity || 0)
            const unitPrice = toMoney(item?.value ?? item?.price)
            const totalPrice = toMoney(item?.total ?? (unitPrice * quantity))

            card.order = Math.min(card.order, index)
            card.rootItem = item
            card.rootKey = card.rootKey || getNodeKey(item)
            card.rootProductKey = card.rootProductKey || getCatalogProductKey(item)
            card.name = getNodeName(item) || card.name || `Item #${index + 1}`
            card.description = getNodeDescription(item) || card.description
            card.observation = getNodeObservation(item) || card.observation
            card.quantity = quantity
            card.unitPrice = unitPrice > 0 ? unitPrice : card.unitPrice
            card.totalPrice = totalPrice
            card.itemColor = getItemColor(order, item)
        })

        items.forEach((item, index) => {
            if (!item?.productGroup) return

            const card = resolveCardForGroupedItem(item, index)
            const quantity = Number(item?.quantity || 0)
            const unitPrice = toMoney(item?.value ?? item?.price)
            const totalPrice = toMoney(item?.total ?? (unitPrice * quantity))
            const groupLabel = getChildBucketLabel(item)

            if (!card.groups.has(groupLabel)) {
                card.groups.set(groupLabel, {
                    label: groupLabel,
                    order: index,
                    items: [],
                })
            }

            card.groups.get(groupLabel).items.push({
                id: getNodeKey(item) || `${card.key}-${groupLabel}-${index}`,
                name: getNodeName(item),
                quantity,
                description: getNodeDescription(item),
                observation: getNodeObservation(item),
                totalPrice,
                itemColor: getItemColor(order, item),
                isZero: quantity === 0,
            })
        })

        const normalizedCards = cards
            .sort((left, right) => left.order - right.order)
            .map(card => ({
                ...card,
                quantity: card.quantity > 0 ? card.quantity : Number(card?.rootItem?.quantity || 0),
                groups: Array.from(card.groups.values()).sort((left, right) => left.order - right.order),
            }))

        const cardsByProductKey = new Map()
        normalizedCards.forEach(card => {
            const productKey = normalizeText(card.rootProductKey)
            if (!productKey) return

            if (!cardsByProductKey.has(productKey)) {
                cardsByProductKey.set(productKey, [])
            }

            cardsByProductKey.get(productKey).push(card)
        })

        cardsByProductKey.forEach(cardGroup => {
            if (cardGroup.length < 2) return

            const groupedCard = cardGroup.find(card =>
                card.groups.length > 0 &&
                Number(card?.rootItem?.quantity || card.quantity || 0) <= 0,
            )

            if (!groupedCard) return

            const donorCard = cardGroup.find(card =>
                card !== groupedCard &&
                card.groups.length === 0 &&
                Number(card.quantity || 0) > 0 &&
                normalizeText(card.name).toLowerCase() === normalizeText(groupedCard.name).toLowerCase(),
            )

            if (!donorCard) return

            groupedCard.quantity = donorCard.quantity
            groupedCard.unitPrice = groupedCard.unitPrice > 0 ? groupedCard.unitPrice : donorCard.unitPrice
            groupedCard.totalPrice = groupedCard.totalPrice > 0 ? groupedCard.totalPrice : donorCard.totalPrice
            groupedCard.description = groupedCard.description || donorCard.description
            groupedCard.observation = groupedCard.observation || donorCard.observation
            groupedCard.itemColor = groupedCard.itemColor || donorCard.itemColor
            groupedCard.rootItem = {
                ...(groupedCard.rootItem || {}),
                quantity: donorCard.quantity,
                value: donorCard.unitPrice,
                price: donorCard.unitPrice,
                total: donorCard.totalPrice,
            }

            donorCard.hidden = true
        })

        return normalizedCards
            .filter(card => !card.hidden)
            .filter(card => card.rootItem || card.groups.length > 0)
    }

    const productCards = useMemo(
        () => buildProductCards(order?.orderProducts || []),
        [order],
    )

    return (
        <>
            {productCards.map((card, index) => {
                const rootItem = card.rootItem || {}
                const isRootZero = Number(rootItem?.quantity || 0) === 0
                const itemColor = card.itemColor || getItemColor(order, rootItem)

                return (
                    <View key={card.key || `card-${index}`}>
                        <View
                            style={[
                                styles.itemRow,
                                {
                                    borderLeftWidth: 3,
                                    borderLeftColor: isRootZero ? 'red' : itemColor,
                                },
                            ]}
                        >
                            <Text style={styles.text} numberOfLines={2}>
                                <Text style={[styles.statusMarker, { color: isRootZero ? 'red' : itemColor }]}>* </Text>
                                {isRootZero ? (
                                    <Text style={inlineStyle_364_42}>REMOVER </Text>
                                ) : null}
                                {!isRootZero ? (
                                    <Text style={styles.qtyText}>{normalizeQuantity(card.quantity)}x </Text>
                                ) : null}
                                {card.name || `Item #${index + 1}`}
                            </Text>

                            {showDetails && !!card.description && (
                                <Text style={styles.subText} numberOfLines={2}>
                                    {card.description}
                                </Text>
                            )}

                            {showDetails && !!card.observation && (
                                <Text style={styles.subText} numberOfLines={2}>
                                    Obs: {card.observation}
                                </Text>
                            )}

                            {showDetails && card.unitPrice > 0 && (
                                <View style={inlineStyle_385_38}>
                                    <Text style={styles.subText}>{Formatter.formatMoney(card.unitPrice)} / un</Text>
                                    <Text style={styles.subText}>{Formatter.formatMoney(card.totalPrice || 0)}</Text>
                                </View>
                            )}

                            {card.groups.length > 0 && (
                                <View style={inlineStyle_392_38}>
                                    {card.groups.map(group => (
                                        <View key={`${card.key}-${group.label}`} style={styles.groupWrap}>
                                            {!!group.label && (
                                                <View style={styles.groupTitlePill}>
                                                    <Text style={styles.groupTitle}>{group.label}</Text>
                                                </View>
                                            )}

                                            {group.items.map(child => {
                                                const childQuantityPrefix = formatQuantityPrefix(child.quantity)

                                                return (
                                                    <View key={child.id} style={styles.groupItem}>
                                                        <View style={styles.groupItemRow}>
                                                            <Text style={styles.groupItemText}>
                                                                <Text style={[styles.statusMarker, { color: child.isZero ? 'red' : child.itemColor }]}>* </Text>
                                                                {child.isZero ? (
                                                                    <Text style={inlineStyle_410_74}>REMOVER </Text>
                                                                ) : null}
                                                                {!child.isZero && childQuantityPrefix ? (
                                                                    <Text style={styles.qtyText}>{childQuantityPrefix}</Text>
                                                                ) : null}
                                                                {child.name}
                                                            </Text>

                                                            {showDetails && child.totalPrice > 0 && (
                                                                <Text style={styles.groupItemPriceText}>
                                                                    {Formatter.formatMoney(child.totalPrice)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {showDetails && !!child.description && (
                                                            <Text style={styles.groupItemMetaText}>
                                                                {child.description}
                                                            </Text>
                                                        )}
                                                        {showDetails && !!child.observation && (
                                                            <Text style={styles.groupItemMetaText}>
                                                                Obs: {child.observation}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                );
            })}
        </>
    );
}

export default OrderProducts
