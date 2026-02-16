import React, { useMemo } from 'react'
import { View, Text } from 'react-native'

const OrderProducts = ({ order, scale, styles }) => {

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
                        marginLeft: level * 14 * scale,
                        borderLeftColor: getItemColor(order, node),
                    },
                ]}
            >
                <Text style={level === 0 ? styles.text : styles.subText}>
                    {node.quantity} x {node.product.product}
                </Text>
            </View>

            {node.children.map(child =>
                renderNode(child, level + 1)
            )}
        </View>
    )

    const hierarchy = useMemo(() => {
        const ordered = sortProducts(order.orderProducts || [])
        return buildHierarchyByGroup(ordered)
    }, [order])

    return (
        <>
            {hierarchy.map(node =>
                renderNode(node)
            )}
        </>
    )
}

export default OrderProducts