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
import DisplayPrinterSelectionModal from '../DisplayPrinterSelectionModal';
import RealtimeDebugBar from '@controleonline/ui-ppc/src/react/components/RealtimeDebugBar';

const normalizeText = value => String(value || '').trim();

const DISPLAY_QUEUE_FETCH_PAGE_SIZE = 50;
const DISPLAY_QUEUE_FETCH_MAX_PAGES = 10;

const getQueueOrderRealStatus = queueItem => {
    const order = queueItem?.order_product?.order || queueItem?.order || {};
    const candidates = [
        order?.status?.realStatus,
        order?.status?.real_status,
        order?.realStatus,
        order?.real_status,
        queueItem?.orderQueue?.status?.realStatus,
        queueItem?.orderQueue?.status?.real_status,
    ];

    return normalizeText(
        candidates.find(value => normalizeText(value))
    ).toLowerCase();
};

const isDisplayVisibleQueueItem = queueItem => getQueueOrderRealStatus(queueItem) === 'open';

const filterDisplayVisibleQueueItems = items =>
    (Array.isArray(items) ? items : []).filter(isDisplayVisibleQueueItem);

const fetchDisplayVisibleQueueItems = async ({
    statusIds,
    queueIds,
    providerId,
    itemsPerPage = DISPLAY_QUEUE_FETCH_PAGE_SIZE,
    maxPages = DISPLAY_QUEUE_FETCH_MAX_PAGES,
}) => {
    const normalizedStatusIds = [...new Set((Array.isArray(statusIds) ? statusIds : []).filter(Boolean))];
    const normalizedQueueIds = [...new Set((Array.isArray(queueIds) ? queueIds : []).filter(Boolean))];

    if (!providerId || normalizedStatusIds.length === 0 || normalizedQueueIds.length === 0) {
        return [];
    }

    const visibleItems = [];
    let page = 1;

    while (page <= maxPages) {
        const response = await api.fetch('order_product_queues', {
            params: {
                status: normalizedStatusIds,
                itemsPerPage,
                page,
                'order_product.order.provider': providerId,
                queue: normalizedQueueIds,
            },
        });

        const pageItems = Array.isArray(response?.member) ? response.member : [];
        visibleItems.push(...filterDisplayVisibleQueueItems(pageItems));

        const responseTotalItems = Number(response?.totalItems);
        const totalItems = Number.isFinite(responseTotalItems) && responseTotalItems > 0
            ? responseTotalItems
            : pageItems.length;
        const fetchedCount = ((page - 1) * itemsPerPage) + pageItems.length;
        const hasMorePages = pageItems.length === itemsPerPage && fetchedCount < totalItems;

        if (!hasMorePages) {
            break;
        }

        page += 1;
    }

    return visibleItems;
};

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
    const queuesStore = useStore('queues');
    const displayQueueStore = useStore('display_queues');
    const websocketStore = useStore('websocket');
    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: queuesActions, getters: queuesGetters } = queuesStore;
    const { actions: displayQueueActions, getters: displayQueueGetters } = displayQueueStore;
    const queueMessages = queuesGetters?.messages;
    const displayQueueMessages = displayQueueGetters?.messages;
    const websocketStatus = websocketStore?.getters?.summary || {};
    const websocketConnected = Boolean(websocketStatus?.connected);
    const {
        printOrderProductToAttachedPrinter,
        printerOptions,
        selectedPrinterDeviceId,
        isPrinterSelectionVisible,
        isSavingPrinterSelection,
        handleSelectPrinter,
        closePrinterSelection,
    } = useDisplayPrint({display});

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
    const [refreshDebug, setRefreshDebug] = useState({
        lastAt: null,
        lastSource: 'boot',
        lastDetail: 'startup',
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
    const noteRefresh = useCallback((source, detail = '') => {
        setRefreshDebug({
            lastAt: new Date().toISOString(),
            lastSource: source || 'manual',
            lastDetail: detail || '',
        });
    }, []);

    const onRequest = useCallback(async (source = 'manual', detail = '') => {
        if (!currentCompany?.id || !displayId) {
            return;
        }

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

        const [visibleInOrders, visibleWorkingOrders, visibleOutOrders] = await Promise.all([
            fetchDisplayVisibleQueueItems({
                statusIds: inIds,
                queueIds,
                providerId: currentCompany?.id,
            }),
            fetchDisplayVisibleQueueItems({
                statusIds: workingIds,
                queueIds,
                providerId: currentCompany?.id,
            }),
            fetchDisplayVisibleQueueItems({
                statusIds: outIds,
                queueIds,
                providerId: currentCompany?.id,
            }),
        ]);

        // 🔥 UPDATE ATÔMICO (sem piscar)
        setOrders({
            status_in: visibleInOrders,
            status_working: visibleWorkingOrders,
            status_out: visibleOutOrders,
        });

        setTotals({
            status_in: visibleInOrders.length,
            status_working: visibleWorkingOrders.length,
            status_out: visibleOutOrders.length,
        });

        setLoaded({
            status_in: true,
            status_working: true,
            status_out: true,
        });

        setStatusIn(_statusIn);
        setStatusWorking(_statusWorking);
        setStatusOut(_statusOut);
        noteRefresh(source, detail);
    }, [currentCompany?.id, displayId, displayQueueActions, noteRefresh]);

    const hasQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(queueMessages) ? queueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id)
            ),
        [currentCompany?.id, queueMessages]
    );

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
        (orderProduct, orderProductQueue = null) => {
            const resolvedOrderProduct = orderProduct || orderProductQueue?.order_product || null;
            const queueItemId =
                parseEntityId(orderProductQueue?.id) ||
                parseEntityId(orderProductQueue?.queueEntry?.id) ||
                null;

            const orderProductId = parseEntityId(
                resolvedOrderProduct?.id || resolvedOrderProduct?.['@id']
            );

            if (!orderProductId || !queueItemId) {
                return;
            }

            printOrderProductToAttachedPrinter({
                orderProductId,
                orderProductQueueIds: [queueItemId],
            });
        },
        [printOrderProductToAttachedPrinter]
    );

    useEffect(() => {
        if (
            isSaving ||
            (!hasQueueRefreshMessage &&
                !hasDisplayQueueRefreshMessage &&
                !hasOrderProductQueueRefreshMessage)
        ) {
            return;
        }

        queuesActions.setMessages(removeConsumedMessages(queueMessages, currentCompany?.id));
        displayQueueActions.setMessages(removeConsumedMessages(displayQueueMessages, currentCompany?.id));
        actions.setMessages(removeConsumedMessages(orderProductQueueMessages, currentCompany?.id));
        const refreshSources = [
            hasQueueRefreshMessage ? 'queues' : '',
            hasDisplayQueueRefreshMessage ? 'display_queues' : '',
            hasOrderProductQueueRefreshMessage ? 'order_products_queue' : '',
        ].filter(Boolean);

        const refreshTimeout = setTimeout(() => {
            onRequest('socket', refreshSources.join('+'));
        }, 220);

        return () => clearTimeout(refreshTimeout);
    }, [
        actions,
        currentCompany?.id,
        displayQueueActions,
        displayQueueMessages,
        hasQueueRefreshMessage,
        hasDisplayQueueRefreshMessage,
        hasOrderProductQueueRefreshMessage,
        isSaving,
        onRequest,
        orderProductQueueMessages,
        queueMessages,
        queuesActions,
    ]);

    // 🔥 PRIMEIRA CARGA
    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return undefined;
            onRequest('focus', 'screen-focus');
            const refreshIntervalMs = websocketConnected ? 30000 : 20000;

            const interval = setInterval(() => {
                if (!isSaving) {
                    onRequest(
                        'interval',
                        websocketConnected ? 'connected-poll' : 'fallback-poll'
                    );
                }
            }, refreshIntervalMs);

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
                        onPrint={handlePrintQueueItem}
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
                            onPrint={handlePrintQueueItem}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}

                    {modalType === 'out' && (
                        <InOut
                            orders={orders.status_out}
                            total={totals.status_out}
                            status_in={statusOut}
                            onPrint={handlePrintQueueItem}
                            ppcColorsOverride={ppcColors}
                            onReload={onRequest}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            <DisplayPrinterSelectionModal
                visible={isPrinterSelectionVisible}
                printers={printerOptions}
                selectedPrinterDeviceId={selectedPrinterDeviceId}
                saving={isSavingPrinterSelection}
                onSelectPrinter={handleSelectPrinter}
                onClose={closePrinterSelection}
                ppcColorsOverride={ppcColors}
            />

            <RealtimeDebugBar
                companyId={currentCompany?.id}
                ppcColors={ppcColors}
                refreshState={refreshDebug}
                websocketStatus={websocketStatus}
            />
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
