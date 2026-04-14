import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import OrderProductComponents from './../../OrderProductComponents';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import {
    resolveDisplayTicketSummary,
    resolveOrderProductComment,
    resolveOrderProductDescription,
} from '../displayPrintRules';

const formatDisplayTime = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--:--';
    }

    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const resolveMarketplaceTitle = marketplaceLabel =>
    marketplaceLabel ? `Pedido ${marketplaceLabel}` : 'Pedido delivery';

const Working = ({
    orders = [],
    total = 0,
    status_working,
    status_out,
    saveQueueItem = null,
    onTransition = null,
    onPrint = null,
    ppcColorsOverride = null,
}) => {
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const finalize = async order => {
        if (!status_out?.['@id'] || typeof saveQueueItem !== 'function') {
            return;
        }

        const updatedQueueItem = await saveQueueItem({
            id: order.id,
            status: status_out['@id'],
        });

        if (typeof onTransition === 'function') {
            onTransition(updatedQueueItem, 'status_working', 'status_out');
        }
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
                    {orders.map(order => {
                        const orderProduct = order.order_product || {};
                        const orderEntity = orderProduct.order || {};
                        const orderSummary = resolveDisplayTicketSummary(orderEntity);
                        const productDescription =
                            resolveOrderProductDescription(orderProduct);
                        const productComment = resolveOrderProductComment(orderProduct);

                        return (
                        <Card key={order.id} style={styles.orderCard}>
                            <Card.Content style={styles.orderContent}>
                                <View style={styles.ticketTopRow}>
                                    <Text style={styles.internalOrderCode}>
                                        Pedido #{orderSummary.internalOrderCode || '-'}
                                    </Text>
                                    <Text style={styles.orderMeta}>
                                        Pedido as {formatDisplayTime(order.registerTime)}
                                    </Text>
                                </View>

                                {!!orderSummary.marketplaceOrderCode && (
                                    <View style={styles.marketplaceHighlight}>
                                        <Text style={styles.marketplaceLabel}>
                                            {resolveMarketplaceTitle(
                                                orderSummary.marketplaceLabel
                                            )}
                                        </Text>
                                        <Text style={styles.marketplaceCode}>
                                            {orderSummary.marketplaceOrderCode}
                                        </Text>
                                    </View>
                                )}

                                {!!orderSummary.clientName && (
                                    <Text style={styles.clientName}>
                                        {orderSummary.clientName}
                                    </Text>
                                )}

                                {order.registerTime !== order.updateTime && (
                                    <Text style={styles.orderMeta}>
                                        Em preparo desde {formatDisplayTime(order.updateTime)}
                                    </Text>
                                )}

                                <Text style={styles.orderQty}>
                                    {orderProduct?.quantity} {orderProduct?.product?.product}(s)
                                </Text>

                                {!!productDescription && (
                                    <Text style={styles.detailLine}>
                                         {productDescription}
                                    </Text>
                                )}

                                {!!productComment && (
                                    <Text style={styles.detailLine}>
                                        OBS: {productComment}
                                    </Text>
                                )}
                            </Card.Content>

                            <OrderProductComponents
                                order_product={orderProduct}
                                ppcColorsOverride={ppcColors}
                            />

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
                                            onPress={() => onPrint(order.order_product, order)}
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
                                        disabled={!status_out?.['@id'] || typeof saveQueueItem !== 'function'}
                                        onPress={() => finalize(order)}
                                    >
                                        Finalizar
                                    </Button>
                                </Card.Actions>
                            )}
                        </Card>
                        );
                    })}
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
        ticketTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
        },
        internalOrderCode: {
            flex: 1,
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        marketplaceHighlight: {
            marginTop: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ppcColors.accent,
            backgroundColor: ppcColors.isLight
                ? 'rgba(250, 204, 21, 0.12)'
                : 'rgba(250, 204, 21, 0.14)',
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        marketplaceLabel: {
            color: ppcColors.textSecondary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        marketplaceCode: {
            marginTop: 3,
            color: ppcColors.textPrimary,
            fontSize: 24,
            fontWeight: '900',
            lineHeight: 28,
        },
        clientName: {
            marginTop: 8,
            color: ppcColors.textPrimary,
            fontSize: 16,
            fontWeight: '800',
        },
        orderMeta: {
            marginTop: 4,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        orderQty: {
            marginTop: 7,
            color: ppcColors.textPrimary,
            fontSize: 16,
            fontWeight: '900',
        },
        detailLine: {
            marginTop: 4,
            color: ppcColors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
            lineHeight: 17,
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
