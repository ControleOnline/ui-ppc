import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useStore } from '@store';
import OrderProductComponents from './../../OrderProductComponents';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';

const Working = ({
    orders = [],
    total = 0,
    status_working,
    status_out,
    onPrint = null,
    onReload,
    ppcColorsOverride = null,
}) => {
    const store = useStore('order_products_queue');
    const { actions } = store;
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const finalize = async order => {
        await actions.save({
            id: order.id,
            status: status_out['@id'],
        });
        onReload();
    };

    return (
        <View style={styles.pageSection}>
            <Card style={styles.stageCard}>
                <View style={styles.stageAccent} />
                <Card.Content style={styles.stageHeader}>
                    <Text style={styles.stageTitle}>{status_working?.status || 'Status'}</Text>
                    <View style={styles.totalPill}>
                        <Text style={styles.totalPillText}>{total}</Text>
                    </View>
                </Card.Content>
                <Card.Content style={styles.listContent}>
                    {orders.length === 0 && (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>Nenhum item neste status.</Text>
                        </View>
                    )}
                    {orders.map(order => (
                        <Card key={order.id} style={styles.orderCard}>
                            <Card.Content style={styles.orderContent}>
                                <Text style={styles.orderTitle}>Pedido #{order.order_product?.order.id}</Text>
                                <Text style={styles.orderSubtitle}>{order.order_product?.order.client?.name}</Text>
                                <Text style={styles.orderMeta}>
                                    Horário do pedido:{' '}
                                    {new Date(order.registerTime).toLocaleTimeString('pt-br', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                {order.registerTime !== order.updateTime && (
                                    <Text style={styles.orderMeta}>
                                        Iniciou nesse status:{' '}
                                        {new Date(order.updateTime).toLocaleTimeString('pt-br', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                )}
                                <Text style={styles.orderQty}>
                                    {order.order_product?.quantity}{' '}
                                    {order.order_product?.product.product}(s)
                                </Text>
                            </Card.Content>

                            <OrderProductComponents order_product={order.order_product} />

                            {(status_out || typeof onPrint === 'function') && (
                                <Card.Actions style={styles.actions}>
                                    {typeof onPrint === 'function' && (
                                        <Button
                                            mode="outlined"
                                            textColor={ppcColors.textPrimary}
                                            style={[
                                                styles.actionButton,
                                                styles.secondaryActionButton,
                                            ]}
                                            labelStyle={[
                                                styles.actionLabel,
                                                styles.secondaryActionLabel,
                                            ]}
                                            onPress={() => onPrint(order)}
                                        >
                                            Imprimir
                                        </Button>
                                    )}
                                    <Button
                                        mode="contained"
                                        buttonColor={ppcColors.accent}
                                        textColor={ppcColors.pillTextDark}
                                        style={styles.actionButton}
                                        labelStyle={styles.actionLabel}
                                        onPress={() => finalize(order)}
                                    >
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

const createStyles = (ppcColors) =>
    StyleSheet.create({
        pageSection: {
            width: '100%',
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: ppcColors.appBg,
        },
        stageCard: {
            overflow: 'hidden',
            backgroundColor: ppcColors.cardBg,
            borderColor: ppcColors.border,
            borderWidth: 1,
            borderRadius: 16,
        },
        stageAccent: {
            height: 2,
            backgroundColor: ppcColors.accent,
        },
        stageHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 2,
            paddingBottom: 6,
        },
        stageTitle: {
            color: ppcColors.textPrimary,
            fontWeight: '900',
            fontSize: 22,
            lineHeight: 26,
            letterSpacing: 0.2,
        },
        totalPill: {
            minWidth: 50,
            borderRadius: 999,
            paddingHorizontal: 11,
            paddingVertical: 4,
            backgroundColor: ppcColors.isLight ? ppcColors.panelBg : ppcColors.accent,
            borderWidth: 1,
            borderColor: ppcColors.accent,
            alignItems: 'center',
            marginTop: 1,
        },
        totalPillText: {
            color: ppcColors.isLight ? ppcColors.accent : ppcColors.pillTextDark,
            fontSize: 17,
            fontWeight: '900',
        },
        listContent: {
            paddingTop: 0,
            paddingBottom: 2,
            flexGrow: 0,
        },
        emptyWrap: {
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: ppcColors.borderSoft,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 12,
            marginBottom: 8,
            backgroundColor: ppcColors.cardBgSoft,
        },
        emptyText: {
            color: ppcColors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        orderCard: {
            width: '100%',
            marginBottom: 10,
            backgroundColor: ppcColors.cardBgSoft,
            borderColor: ppcColors.border,
            borderWidth: 1,
            borderRadius: 12,
            alignSelf: 'stretch',
        },
        orderContent: {
            paddingBottom: 4,
        },
        orderTitle: {
            color: ppcColors.textPrimary,
            fontSize: 19,
            fontWeight: '900',
            lineHeight: 22,
        },
        orderSubtitle: {
            marginTop: 1,
            color: ppcColors.textSecondary,
            fontSize: 14,
            fontWeight: '700',
        },
        orderMeta: {
            marginTop: 1,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        orderQty: {
            marginTop: 4,
            color: ppcColors.textPrimary,
            fontSize: 14,
            fontWeight: '800',
        },
        actions: {
            justifyContent: 'flex-end',
            paddingHorizontal: 14,
            paddingBottom: 10,
            paddingTop: 4,
            flexWrap: 'wrap',
        },
        actionButton: {
            borderRadius: 999,
            minWidth: 132,
        },
        secondaryActionButton: {
            marginRight: 8,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.panelBg,
            minWidth: 120,
        },
        actionLabel: {
            fontWeight: '900',
            fontSize: 14,
        },
        secondaryActionLabel: {
            fontWeight: '800',
        },
    });

export default Working;
