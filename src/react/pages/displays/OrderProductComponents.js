import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { List, Text, Badge } from 'react-native-paper';
import { useStore } from '@store';

const OrderProductComponents = ({ order_product }) => {
    const store = useStore('order_products');
    const { actions } = store;

    const [groups, setGroups] = useState({});

    const onRequest = async () => {
        if (!order_product) return;

        const filter = {
            order: order_product.order['@id'],
            parentProduct: order_product.product['@id'],
            orderProduct: order_product['@id'],
        };

        const products = await actions.getItems(filter);

        const grouped = products.reduce((acc, product) => {
            if (!product.productGroup) return acc;

            const groupId = product.productGroup.id;

            if (!acc[groupId]) {
                acc[groupId] = {
                    ...product.productGroup,
                    products: [],
                };
            }

            acc[groupId].products.push(product);
            return acc;
        }, {});

        setGroups(grouped);
    };

    useEffect(() => {
        onRequest();
    }, []);

    return (
        <View>
            {Object.keys(groups).map(groupId => {
                const group = groups[groupId];

                return (
                    <View key={groupId} style={{ marginBottom: 8 }}>
                        <Text variant="labelLarge">{group.productGroup}</Text>

                        {group.products.map(product => (
                            <List.Item
                                key={product.id}
                                title={product.product.product}
                                description={`Preço: R$ ${product.price}`}
                                left={() => (
                                    <Badge style={{ alignSelf: 'center' }}>
                                        x{product.quantity}
                                    </Badge>
                                )}
                            />
                        ))}
                    </View>
                );
            })}
        </View>
    );
};

export default OrderProductComponents;
