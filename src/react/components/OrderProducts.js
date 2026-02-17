import React, { useMemo } from 'react'
import { View, Text } from 'react-native'

const OrderProducts = ({ order, scale, styles, indentStep = 16 }) => {

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

    const renderNode = (node, level = 0) => (
        <View key={node.id}>
            <View
                style={[
                    styles.itemRow,
                    {
                        marginLeft: level * indentStep * scale,
                        borderLeftColor: getItemColor(order, node),
                        opacity: level === 0 ? 1 : 0.96,
                    },
                ]}
            >
                <Text style={level === 0 ? styles.text : styles.subText} numberOfLines={2}>
                    <Text style={[styles.statusMarker, { color: getItemColor(order, node) }]}>● </Text>
                    <Text style={styles.qtyText}>{node.quantity}x </Text>
                    {node.product.product}
                </Text>
            </View>

            {node.children.map(child =>
                renderNode(child, level + 1)
            )}
        </View>
    )

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
