import React from 'react';
import { View } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useStore } from '@store';
import OrderProductComponents from './../../OrderProductComponents';

const Working = ({ orders = [], total = 0, status_working, status_out, onReload }) => {
    const store = useStore('order_products_queue');
    const { actions } = store;

    const finalize = async order => {
        await actions.save({
            id: order.id,
            status: status_out['@id'],
        });
        onReload();
    };

    return (
        <View style={{ width: '100%', padding: 8 }}>
            <Card>
                <Card.Title title={`${status_working?.status} (${total})`} />
                <Card.Content style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {orders.map(order => (
                        <Card key={order.id} style={{ width: '100%', marginBottom: 8 }}>
                            <Card.Content>
                                <Text>Pedido #{order.order_product?.order.id}</Text>
                                <Text>{order.order_product?.order.client?.name}</Text>
                                <Text>
                                    Horário do pedido:{' '}
                                    {new Date(order.registerTime).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                {order.registerTime !== order.updateTime && (
                                    <Text>
                                        Iniciou nesse status:{' '}
                                        {new Date(order.updateTime).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                )}
                                <Text>
                                    {order.order_product?.quantity}{' '}
                                    {order.order_product?.product.product}(s)
                                </Text>
                            </Card.Content>

                            <Card.Content>
                                <OrderProductComponents order_product={order.order_product} />
                            </Card.Content>

                            {status_out && (
                                <Card.Actions>
                                    <Button mode="contained" onPress={() => finalize(order)}>
                                        Finalizar
                                    </Button>
                                </Card.Actions>
                            )}
                        </Card>
                    ))}
                </Card.Content>
            </Card>
        </View>
    );
};

export default Working;