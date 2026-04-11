import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    useWindowDimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InOut from './Status/InOut';
import Working from './Status/Working';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import { useDisplayPrint } from '../useDisplayPrint';

const parseEntityId = value => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) return Number(trimmed);
        const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/);
        if (iriMatch?.[1]) return Number(iriMatch[1]);
        return null;
    }
    if (typeof value?.id === 'number') return value.id;
    if (typeof value?.id === 'string') return parseEntityId(value.id);
    if (value?.['@id']) return parseEntityId(String(value['@id']));
    return null;
};

const isMessageForCompany = (message, companyId) => {
    if (!message) return false;

    const expectedCompanyId = parseEntityId(companyId);
    const messageCompanyId = parseEntityId(message.company);

    if (!expectedCompanyId || !messageCompanyId) {
        return true;
    }

    return expectedCompanyId === messageCompanyId;
};

const removeConsumedMessages = (messages, companyId) =>
    (Array.isArray(messages) ? messages : []).filter(
        message => !isMessageForCompany(message, companyId)
    );

const DisplayProducts = ({ display = {} }) => {
    const route = useRoute();
    const { width } = useWindowDimensions();

    const displayId = decodeURIComponent(
        route.params?.id ||
        (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('id') || ''
            : '')
    );

    const peopleStore = useStore('people');
    const displayQueueStore = useStore('display_queues');
    const websocketStore = useStore('websocket');
    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: displayQueueActions, getters: displayQueueGetters } = displayQueueStore;
    const displayQueueMessages = displayQueueGetters?.messages;
    const websocketStatus = websocketStore?.getters?.summary || {};
    const websocketConnected = Boolean(websocketStatus?.connected);
    const { canPrint, printToAttachedPrinter } = useDisplayPrint();

    const [loaded, setLoaded] = useState({});
    const [statusIn, setStatusIn] = useState(null);
    const [statusWorking, setStatusWorking] = useState(null);
    const [statusOut, setStatusOut] = useState(null);

    const store = useStore('order_products_queue');
    const { actions, getters } = store;
    const { isSaving, messages: orderProductQueueMessages } = getters;

    const [modalType, setModalType] = useState(null);

    const [orders, setOrders] = useState({
        status_in: [],
        status_working: [],
        status_out: [],
    });

    const [totals, setTotals] = useState({
        status_in: 0,
        status_working: 0,
        status_out: 0,
    });

    const getResponsiveItemsPerPage = () => 6;

    // 🔥 AUTO START (mantido)
    useEffect(() => {
        const autoStart = async () => {
            const itensPerPage = getResponsiveItemsPerPage();

            if (isSaving) return;
            if (!loaded.status_working) return;
            if (!loaded.status_in) return;
            if (!orders.status_in.length) return;
            if (totals.status_working >= itensPerPage) return;
            if (totals.status_in === 0) return;

            const needed = itensPerPage - totals.status_working;
            const ordersToStart = orders.status_in.slice(0, needed);

            for (const order of ordersToStart) {
                await actions.save({
                    id: order.id,
                    status: statusWorking['@id'],
                });
            }

            if (ordersToStart.length > 0) {
                await onRequest();
            }
        };

        autoStart();
    }, [orders]);

    // 🔥 REQUEST SEM FLICKER
    const onRequest = useCallback(async () => {
        if (!currentCompany?.id || !displayId) {
            return;
        }

        const rows = getResponsiveItemsPerPage();

        const result = await displayQueueActions.getItems({ display: displayId });

        const inIds = [];
        const workingIds = [];
        const outIds = [];
        const queueIds = [];

        let _statusIn = null;
        let _statusWorking = null;
        let _statusOut = null;

        (Array.isArray(result) ? result : []).forEach(item => {
            queueIds.push(item.queue.id);

            if (item.queue.status_in) {
                inIds.push(item.queue.status_in.id);
                _statusIn = item.queue.status_in;
            }
            if (item.queue.status_working) {
                workingIds.push(item.queue.status_working.id);
                _statusWorking = item.queue.status_working;
            }
            if (item.queue.status_out) {
                outIds.push(item.queue.status_out.id);
                _statusOut = item.queue.status_out;
            }
        });

        const [inData, workingData, outData] = await Promise.all([
            api.fetch('order_product_queues', {
                params: {
                    status: [...new Set(inIds)],
                    itemsPerPage: rows,
                    'order_product.order.provider': currentCompany?.id,
                    queue: queueIds,
                },
            }),
            api.fetch('order_product_queues', {
                params: {
                    status: [...new Set(workingIds)],
                    itemsPerPage: rows,
                    'order_product.order.provider': currentCompany?.id,
                    queue: queueIds,
                },
            }),
            api.fetch('order_product_queues', {
                params: {
                    status: [...new Set(outIds)],
                    itemsPerPage: rows,
                    'order_product.order.provider': currentCompany?.id,
                    queue: queueIds,
                },
            }),
        ]);

        // 🔥 UPDATE ATÔMICO (sem piscar)
        setOrders({
            status_in: inData?.member || [],
            status_working: workingData?.member || [],
            status_out: outData?.member || [],
        });

        setTotals({
            status_in: Number(inData?.totalItems) || 0,
            status_working: Number(workingData?.totalItems) || 0,
            status_out: Number(outData?.totalItems) || 0,
        });

        setLoaded({
            status_in: true,
            status_working: true,
            status_out: true,
        });

        setStatusIn(_statusIn);
        setStatusWorking(_statusWorking);
        setStatusOut(_statusOut);
    }, [currentCompany?.id, displayId, displayQueueActions]);

    const hasDisplayQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(displayQueueMessages) ? displayQueueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id)
            ),
        [currentCompany?.id, displayQueueMessages]
    );

    const hasOrderProductQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(orderProductQueueMessages) ? orderProductQueueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id)
            ),
        [currentCompany?.id, orderProductQueueMessages]
    );

    const handlePrintQueueItem = useCallback(
        orderProductQueue => {
            const orderId = parseEntityId(orderProductQueue?.order_product?.order?.id);
            const queueItemId = parseEntityId(orderProductQueue?.id);

            if (!orderId || !queueItemId) {
                return;
            }

            printToAttachedPrinter({
                orderId,
                orderProductQueueIds: [queueItemId],
            });
        },
        [printToAttachedPrinter]
    );

    useEffect(() => {
        if (isSaving || (!hasDisplayQueueRefreshMessage && !hasOrderProductQueueRefreshMessage)) {
            return;
        }

        displayQueueActions.setMessages(removeConsumedMessages(displayQueueMessages, currentCompany?.id));
        actions.setMessages(removeConsumedMessages(orderProductQueueMessages, currentCompany?.id));

        const refreshTimeout = setTimeout(() => {
            onRequest();
        }, 220);

        return () => clearTimeout(refreshTimeout);
    }, [
        actions,
        currentCompany?.id,
        displayQueueActions,
        displayQueueMessages,
        hasDisplayQueueRefreshMessage,
        hasOrderProductQueueRefreshMessage,
        isSaving,
        onRequest,
        orderProductQueueMessages,
    ]);

    // 🔥 PRIMEIRA CARGA
    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return undefined;
            onRequest();

            if (websocketConnected) {
                return undefined;
            }

            const interval = setInterval(() => {
                if (!isSaving) {
                    onRequest();
                }
            }, 20000);

            return () => clearInterval(interval);
        }, [currentCompany?.id, isSaving, onRequest, websocketConnected])
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryStatsRow}>
                    <TouchableOpacity
                        style={styles.summaryStatPill}
                        onPress={() => setModalType('in')}
                    >
                        <Text style={styles.summaryStatLabel}>Fila</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_in}</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryStatPill}>
                        <Text style={styles.summaryStatLabel}>Prep</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_working}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.summaryStatPill}
                        onPress={() => setModalType('out')}
                    >
                        <Text style={styles.summaryStatLabel}>Pronto</Text>
                        <Text style={styles.summaryStatValue}>{totals.status_out}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* WORKING */}
            <ScrollView contentContainerStyle={styles.content}>
                {loaded.status_working && (
                    <Working
                        orders={orders.status_working}
                        total={totals.status_working}
                        status_working={statusWorking}
                        status_out={statusOut}
                        onPrint={canPrint ? handlePrintQueueItem : null}
                        ppcColorsOverride={ppcColors}
                        onReload={onRequest}
                    />
                )}
            </ScrollView>

            {/* MODAL */}
            <Modal visible={!!modalType} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setModalType(null)}>
                        <Text style={styles.closeButton}>Fechar</Text>
                    </TouchableOpacity>

                    {modalType === 'in' && (
                        <InOut
                            orders={orders.status_in}
                            total={totals.status_in}
                            status_in={statusIn}
                            status_working={statusWorking}
                            onPrint={canPrint ? handlePrintQueueItem : null}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}

                    {modalType === 'out' && (
                        <InOut
                            orders={orders.status_out}
                            total={totals.status_out}
                            status_in={statusOut}
                            onPrint={canPrint ? handlePrintQueueItem : null}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (ppcColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        summaryCard: {
            margin: 12,
            padding: 10,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ppcColors.borderSoft,
            backgroundColor: ppcColors.cardBg,
        },
        summaryStatsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        summaryStatPill: {
            flex: 1,
            marginHorizontal: 3,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            paddingVertical: 10,
            alignItems: 'center',
        },
        summaryStatLabel: {
            fontSize: 11,
            fontWeight: '700',
        },
        summaryStatValue: {
            fontSize: 22,
            fontWeight: '900',
        },
        content: {
            padding: 10,
        },
        modalContainer: {
            flex: 1,
            padding: 10,
            backgroundColor: ppcColors.appBg,
        },
        closeButton: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
        },
    });

export default DisplayProducts;
