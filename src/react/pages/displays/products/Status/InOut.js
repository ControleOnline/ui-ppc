import React, { useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderProductComponents from './../../OrderProductComponents';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import useDisplayQueueStatus from '../hooks/useDisplayQueueStatus';
import buildDisplayOrderHeaderPayload from './orderHeaderPayload';
import createStyles from './status.styles';

const getQueueItemKey = item =>
    String(item?.id || item?.['@id'] || '').trim();

const InOut = ({
    companyId = null,
    queueBindings = null,
    stageKey = 'status_in',
    dateRange = null,
    refreshToken = 0,
    onSnapshotChange = null,
    totalOverride = null,
    status_working = null,
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
    const displayTotal =
        typeof totalOverride === 'number' ? totalOverride : total;
    const [movingIds, setMovingIds] = useState(() => new Set());
    const canStart = status_working?.['@id'] && typeof saveQueueItem === 'function';
    const visibleOrders = useMemo(
        () => orders.filter(order => !movingIds.has(getQueueItemKey(order))),
        [movingIds, orders],
    );

    const start = async order => {
        if (!canStart) {
            return;
        }

        const queueItemKey = getQueueItemKey(order);
        if (queueItemKey) {
            setMovingIds(currentIds => new Set([...currentIds, queueItemKey]));
        }

        try {
            const updatedQueueItem = await saveQueueItem({
                id: order.id,
                status: status_working['@id'],
            });

            if (typeof onTransition === 'function') {
                onTransition(updatedQueueItem, stageKey, 'status_working');
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
        const orderHeaderPayload = buildDisplayOrderHeaderPayload(orderEntity, order);
        const isMoving = movingIds.has(getQueueItemKey(order));
        const canPreviewOrder =
            typeof onPreviewOrder === 'function' &&
            Boolean(orderEntity?.id || orderEntity?.['@id']);
        const shouldShowActions =
            Boolean(printButtonProps) || canPreviewOrder || canStart;

        return (
            <Card key={order.id} style={styles.orderCard}>
                <Card.Content style={styles.orderContent}>
                    <OrderHeader order={orderHeaderPayload} isKds />
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

                        {canStart ? (
                            <TouchableOpacity
                                onPress={() => start(order)}
                                disabled={isMoving}
                                style={[
                                    styles.actionPrimaryButton,
                                    isMoving ? styles.actionButtonDisabled : null,
                                ]}
                            >
                                {isMoving ? (
                                    <ActivityIndicator size="small" color={ppcColors.pillTextDark} />
                                ) : (
                                    <>
                                        <Icon
                                            name="play-arrow"
                                            size={16}
                                            color={ppcColors.pillTextDark}
                                        />
                                        <Text style={styles.actionPrimaryText}>Iniciar</Text>
                                    </>
                                )}
                            </TouchableOpacity>
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
                        <Text style={styles.totalPillText}>{displayTotal}</Text>
                    </View>
                </View>

                <FlatList
                    data={visibleOrders}
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
