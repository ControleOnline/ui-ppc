import React, { useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderProductComponents from './../../OrderProductComponents';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import useDisplayQueueStatus from '../hooks/useDisplayQueueStatus';
import createStyles from './status.styles';
import {
    resolveDisplayTicketSummary,
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

const getQueueItemKey = item =>
    String(item?.id || item?.['@id'] || '').trim();

const Working = ({
    companyId = null,
    queueBindings = null,
    dateRange = null,
    refreshToken = 0,
    onSnapshotChange = null,
    totalOverride = null,
    status_out = null,
    saveQueueItem = null,
    onTransition = null,
    onPreviewOrder = null,
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
        status: statusWorking,
        loadMore,
    } = useDisplayQueueStatus({
        companyId,
        queueBindings,
        stageKey: 'status_working',
        dateRange,
        refreshToken,
        onSnapshotChange,
    });
    const displayTotal =
        typeof totalOverride === 'number' ? totalOverride : total;
    const [movingIds, setMovingIds] = useState(() => new Set());
    const canFinalize = status_out?.['@id'] && typeof saveQueueItem === 'function';
    const visibleOrders = useMemo(
        () => orders.filter(order => !movingIds.has(getQueueItemKey(order))),
        [movingIds, orders],
    );

    const finalize = async order => {
        if (!canFinalize) {
            return;
        }

        const queueItemKey = getQueueItemKey(order);
        if (queueItemKey) {
            setMovingIds(currentIds => new Set([...currentIds, queueItemKey]));
        }

        try {
            const updatedQueueItem = await saveQueueItem({
                id: order.id,
                status: status_out['@id'],
            });

            if (typeof onTransition === 'function') {
                onTransition(updatedQueueItem, 'status_working', 'status_out');
            }
        } catch {
            if (queueItemKey) {
                setMovingIds(currentIds => {
                    const nextIds = new Set(currentIds);
                    nextIds.delete(queueItemKey);
                    return nextIds;
                });
            }
        }
    };

    const renderOrder = ({ item: order }) => {
        const orderProduct = order.order_product || {};
        const orderEntity = orderProduct.order || {};
        const orderSummary = resolveDisplayTicketSummary(orderEntity);
        const isMoving = movingIds.has(getQueueItemKey(order));
        const canPreviewOrder =
            typeof onPreviewOrder === 'function' &&
            Boolean(orderEntity?.id || orderEntity?.['@id']);
        const shouldShowActions =
            Boolean(printButtonProps) || canPreviewOrder || canFinalize;

        return (
            <Card key={order.id} style={styles.orderCard}>
                <Card.Content style={styles.orderContent}>
                    <View style={styles.ticketTopRow}>
                        <OrderIdentityLabel
                            order={orderEntity}
                            containerStyle={{flex: 1, minWidth: 0}}
                            primaryTextStyle={
                                orderSummary.marketplaceOrderCode
                                    ? styles.marketplaceCode
                                    : styles.internalOrderCode
                            }
                            secondaryTextStyle={styles.internalOrderCode}
                        />
                        <Text style={styles.orderMeta}>
                            Pedido em {formatDisplayDateTime(order.registerTime)}
                        </Text>
                    </View>

                    {!!orderSummary.clientName && (
                        <Text style={styles.clientName}>
                            {orderSummary.clientName}
                        </Text>
                    )}

                    {order.registerTime !== order.updateTime && (
                        <Text style={styles.orderMeta}>
                            Em preparo desde {formatDisplayDateTime(order.updateTime)}
                        </Text>
                    )}
                </Card.Content>

                <OrderProductComponents
                    order_product={orderProduct}
                    ppcColorsOverride={ppcColors}
                />

                {shouldShowActions && (
                    <Card.Actions style={styles.actions}>
                        <View style={styles.actionTools}>
                            {printButtonProps ? (
                                <PrintButton
                                    {...printButtonProps}
                                    job={{
                                        type: 'order-product-queue',
                                        orderProductQueueId: order?.id || order?.['@id'],
                                    }}
                                    compact
                                    layout={{ variant: 'icon' }}
                                    iconColor={ppcColors.accentInfo}
                                    compactButtonStyle={styles.actionIconButton}
                                    compactSelectStyle={styles.actionIconButton}
                                />
                            ) : null}

                            {canPreviewOrder ? (
                                <TouchableOpacity
                                    onPress={() => onPreviewOrder(orderEntity)}
                                    style={styles.actionIconButton}
                                >
                                    <Icon
                                        name="visibility"
                                        size={19}
                                        color={ppcColors.accentInfo}
                                    />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            onPress={() => finalize(order)}
                            disabled={isMoving || !canFinalize}
                            style={[
                                styles.actionPrimaryButton,
                                styles.actionSuccessButton,
                                (isMoving || !canFinalize)
                                    ? styles.actionButtonDisabled
                                    : null,
                            ]}
                        >
                            {isMoving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Icon name="check-circle" size={16} color="#FFFFFF" />
                                    <Text style={[styles.actionPrimaryText, { color: '#FFFFFF' }]}>
                                        Finalizar
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
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
                    <Text style={styles.stageTitle}>{statusWorking?.status || 'Status'}</Text>
                    <View style={styles.totalPill}>
                        <Text style={styles.totalPillText}>{displayTotal}</Text>
                    </View>
                </View>

                <FlatList
                    data={visibleOrders}
                    keyExtractor={(item, index) =>
                        String(item?.id || item?.['@id'] || `status-working-${index}`)
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

export default Working;
