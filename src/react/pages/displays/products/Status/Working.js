import React from 'react';
import { View } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useStore } from '@store';
import OrderProductComponents from './../../OrderProductComponents';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

const Working = ({ orders = [], total = 0, status_working, status_out, onReload }) => {
    const store = useStore('order_products_queue');
    const { actions } = store;
    const { ppcColors } = usePpcTheme();

    const finalize = async order => {
        await actions.save({
            id: order.id,
            status: status_out['@id'],
        });
        onReload();
    };

    return (
        <View style={{ width: '100%', padding: 8, backgroundColor: ppcColors.appBg }}>
            <Card style={{ backgroundColor: ppcColors.cardBg, borderColor: ppcColors.border, borderWidth: 1 }}>
                <Card.Title title={`${status_working?.status} (${total})`} titleStyle={{ color: ppcColors.textPrimary, fontWeight: '800' }} />
                <Card.Content style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {orders.map(order => (
                        <Card key={order.id} style={{ width: '100%', marginBottom: 8, backgroundColor: ppcColors.cardBgSoft, borderColor: ppcColors.border, borderWidth: 1 }}>
                            <Card.Content>
                                <Text style={{ color: ppcColors.textPrimary }}>Pedido #{order.order_product?.order.id}</Text>
                                <Text style={{ color: ppcColors.textSecondary }}>{order.order_product?.order.client?.name}</Text>
                                <Text style={{ color: ppcColors.textSecondary }}>
                                    Horário do pedido:{' '}
                                    {new Date(order.registerTime).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                {order.registerTime !== order.updateTime && (
                                    <Text style={{ color: ppcColors.textSecondary }}>
                                        Iniciou nesse status:{' '}
                                        {new Date(order.updateTime).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                )}
                                <Text style={{ color: ppcColors.textPrimary }}>
                                    {order.order_product?.quantity}{' '}
                                    {order.order_product?.product.product}(s)
                                </Text>
                            </Card.Content>

                            <Card.Content>
                                <OrderProductComponents order_product={order.order_product} />
                            </Card.Content>

                            {status_out && (
                                <Card.Actions>
                                    <Button mode="contained" buttonColor={ppcColors.accent} textColor={ppcColors.textDark} onPress={() => finalize(order)}>
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
