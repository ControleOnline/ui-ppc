import React, { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import useDisplayQueueStatus from '../hooks/useDisplayQueueStatus';
import createStyles from './status.styles';
import {
    resolveDisplayTicketSummary,
    resolveOrderProductComment,
    resolveOrderProductDescription,
} from '../displayPrintRules';

const formatDisplayDateTime = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--/-- --:--';
    }

    const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    });
    const formattedTime = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `${formattedDate} ${formattedTime}`;
};

const resolveMarketplaceTitle = marketplaceLabel =>
    marketplaceLabel ? `Pedido ${marketplaceLabel}` : 'Pedido delivery';

const formatMarketplaceCode = value => {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }

    return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

const InOut = ({
    companyId = null,
    queueBindings = null,
    stageKey = 'status_in',
    dateRange = null,
    refreshToken = 0,
    onSnapshotChange = null,
    status_working = null,
    saveQueueItem = null,
    onTransition = null,
    printButtonProps = null,
    ppcColorsOverride = null,
}) => {
    const { ppcColors: defaultPpcColors } = usePpcTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const {
        items: orders,
        total,
        loaded,
        loadingInitial,
        loadingMore,
        status,
        loadMore,
    } = useDisplayQueueStatus({
        companyId,
        queueBindings,
        stageKey,
        dateRange,
        refreshToken,
        onSnapshotChange,
    });

    const canStart = status_working?.['@id'] && typeof saveQueueItem === 'function';

    const start = async order => {
        if (!canStart) {
            return;
        }

        const updatedQueueItem = await saveQueueItem({
            id: order.id,
            status: status_working['@id'],
        });

        if (typeof onTransition === 'function') {
            onTransition(updatedQueueItem, stageKey, 'status_working');
        }
    };

    const renderOrder = ({ item: order }) => {
        const orderProduct = order.order_product || {};
        const orderEntity = orderProduct.order || {};
        const orderSummary = resolveDisplayTicketSummary(orderEntity);
        const productDescription = resolveOrderProductDescription(orderProduct);
        const productComment = resolveOrderProductComment(orderProduct);

        return (
            <Card key={order.id} style={styles.orderCard}>
                <Card.Content style={styles.orderContent}>
                    <View style={styles.ticketTopRow}>
                        <Text style={styles.internalOrderCode}>
                            Pedido #{orderSummary.internalOrderCode || '-'}
                        </Text>
                        <Text style={styles.orderMeta}>
                            Pedido em {formatDisplayDateTime(order.registerTime)}
                        </Text>
                    </View>

                    {!!orderSummary.marketplaceOrderCode && (
                        <View style={styles.marketplaceHighlight}>
                            <Text style={styles.marketplaceLabel}>
                                {resolveMarketplaceTitle(orderSummary.marketplaceLabel)}
                            </Text>
                            <Text style={styles.marketplaceCode}>
                                {formatMarketplaceCode(orderSummary.marketplaceOrderCode)}
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
                            Alterado em {formatDisplayDateTime(order.updateTime)}
                        </Text>
                    )}

                    <Text style={styles.orderQty}>
                        {orderProduct?.quantity} {orderProduct?.product?.product}(s)
                    </Text>

                    {!!productDescription && (
                        <Text style={styles.detailLine}>
                            DESC: {productDescription}
                        </Text>
                    )}

                    {!!productComment && (
                        <Text style={styles.detailLine}>
                            OBS: {productComment}
                        </Text>
                    )}
                </Card.Content>

                {(canStart || printButtonProps) && (
                    <Card.Actions style={styles.actions}>
                        {printButtonProps ? (
                            <PrintButton
                                {...printButtonProps}
                                job={{
                                    type: 'order-product-queue',
                                    orderProductQueueId: order?.id || order?.['@id'],
                                }}
                                label="Imprimir"
                                iconColor={ppcColors.textPrimary}
                                style={[
                                    styles.actionButton,
                                    styles.secondaryActionButton,
                                ]}
                            />
                        ) : null}
                        {canStart ? (
                            <Button
                                mode="contained"
                                buttonColor={ppcColors.accent}
                                textColor={ppcColors.pillTextDark}
                                style={styles.actionButton}
                                labelStyle={styles.actionLabel}
                                onPress={() => start(order)}
                            >
                                Iniciar
                            </Button>
                        ) : null}
                    </Card.Actions>
                )}
            </Card>
        );
    };

    const renderEmpty = () => {
        if (!loaded || loadingInitial) {
            return (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator animating size="small" color={ppcColors.accent} />
                    <Text style={styles.loadingText}>Carregando pedidos...</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nenhum item neste status.</Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) {
            return <View style={styles.footerSpacer} />;
        }

        return (
            <View style={styles.loadingMoreWrap}>
                <ActivityIndicator animating size="small" color={ppcColors.accent} />
                <Text style={styles.loadingMoreText}>Carregando mais...</Text>
            </View>
        );
    };

    return (
        <View style={styles.pageSection}>
            <Card style={styles.stageCard}>
                <View style={styles.stageAccent} />
                <View style={styles.stageHeader}>
                    <Text style={styles.stageTitle}>{status?.status || 'Status'}</Text>
                    <View style={styles.totalPill}>
                        <Text style={styles.totalPillText}>{total}</Text>
                    </View>
                </View>

                <FlatList
                    data={orders}
                    keyExtractor={(item, index) =>
                        String(item?.id || item?.['@id'] || `${stageKey}-${index}`)
                    }
                    renderItem={renderOrder}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.35}
                    showsVerticalScrollIndicator={false}
                />
            </Card>
        </View>
    );
};

export default InOut;
