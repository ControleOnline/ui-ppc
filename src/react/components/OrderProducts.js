import React, { useMemo } from 'react'
import { View, Text } from 'react-native'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

const OrderProducts = ({ order, scale, styles, indentStep = 16, showDetails = false }) => {

    const getItemColor = (order, product) => {
        const queue = product.orderProductQueues?.[0]
        if (queue?.status?.color) return queue.status.color
        if (order.status?.color) return order.status.color
        return '#333'
    }

    const sortProducts = products => {
        return [...products].sort((a, b) => {
            if (!a.productGroup && b.productGroup) return -1
            if (a.productGroup && !b.productGroup) return 1
            if (a.productGroup === b.productGroup)
                return a.id - b.id
            return (a.productGroup || 0) - (b.productGroup || 0)
        })
    }

    const inferLevelByName = productName => {
        const text = String(productName || '').toLowerCase()
        if (text.includes('terceiro nivel') || text.includes('terceiro nível')) return 2
        if (text.includes('segundo nivel') || text.includes('segundo nível')) return 1
        if (text.includes('primeiro nivel') || text.includes('primeiro nível')) return 0
        return 0
    }

    const buildHierarchyByGroup = products => {
        const roots = []
        let currentRoot = null
        let currentCustom = null

        products.forEach(p => {
            const node = { ...p, children: [] }

            if (!p.productGroup) {
                roots.push(node)
                currentRoot = node
                currentCustom = null
                return
            }

            if (currentCustom) {
                currentCustom.children.push(node)
                return
            }

            if (currentRoot) {
                currentRoot.children.push(node)
            }

            if (p.product?.type === 'custom') {
                currentCustom = node
            }
        })

        return roots
    }

    const renderNode = (node, level = 0) => {
        const isZero = Number(node.quantity) === 0
        const isPositive = Number(node.quantity) > 0
        const itemColor = getItemColor(order, node)
        const description = String(node?.product?.description || node?.description || '').trim()
        const observation = String(
            node?.comments ||
            node?.observation ||
            node?.observations ||
            node?.note ||
            node?.remark ||
            node?.product?.comments ||
            node?.product?.observations ||
            '',
        ).trim()
        const unitPrice = Number(node?.value || node?.price || 0)
        const totalPrice = unitPrice > 0 ? unitPrice * Number(node?.quantity || 0) : 0

        return (
            <View key={node.id}>
                <View
                    style={[
                        styles.itemRow,
                        {
                            marginLeft: level * indentStep * scale,
                            borderLeftWidth: 3,
                            borderLeftColor: isZero ? 'red' : itemColor,
                            opacity: level === 0 ? 1 : 0.96,
                        },
                    ]}
                >
                      {isPositive && (
                          <Text style={level === 0 ? styles.text : styles.subText} numberOfLines={2}>
                              <Text style={[styles.statusMarker, { color: itemColor }]}>* </Text>
                              {(node.quantity > 1) && <Text style={styles.qtyText}>{node.quantity}x </Text>}
                              {node?.product?.name || node?.product?.product || node?.name || node?.product?.description || ''}
                          </Text>
                      )}

                      {isZero && (
                          <Text style={level === 0 ? styles.text : styles.subText} numberOfLines={2}>
                              <Text style={[styles.statusMarker, { color: 'red' }]}>* </Text>
                              <Text style={{ color: 'red', fontWeight: 'bold' }}>REMOVER </Text>
                              {node?.product?.name || node?.product?.product || node?.name || node?.product?.description || ''}
                          </Text>
                      )}

                    {showDetails && !!description && (
                        <Text style={styles.subText} numberOfLines={2}>
                            {description}
                        </Text>
                    )}

                    {showDetails && !!observation && (
                        <Text style={styles.subText} numberOfLines={2}>
                            Obs: {observation}
                        </Text>
                    )}

                    {showDetails && unitPrice > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={styles.subText}>{Formatter.formatMoney(unitPrice)} / un</Text>
                            <Text style={styles.subText}>{Formatter.formatMoney(totalPrice)}</Text>
                        </View>
                    )}
                </View>

                {node.children.map(child =>
                    renderNode(child, level + 1)
                )}
            </View>
        )
    }

    const hierarchy = useMemo(() => {
        const ordered = sortProducts(order.orderProducts || [])
        const hasGroupInfo = ordered.some(item => !!item.productGroup)
        if (!hasGroupInfo) {
            return ordered.map(item => ({
                ...item,
                children: [],
                __level: inferLevelByName(item?.product?.product),
            }))
        }
        return buildHierarchyByGroup(ordered)
    }, [order])

    return (
        <>
            {hierarchy.map(node =>
                renderNode(node, node.__level || 0)
            )}
        </>
    )
}

export default OrderProducts

