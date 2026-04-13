import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
const formatDebugClock = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    const pad = entry => String(entry).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const DISPLAY_QUEUE_FETCH_PAGE_SIZE = 50;
const DISPLAY_QUEUE_FETCH_MAX_PAGES = 10;

const getQueueOrderRealStatus = queueItem => {
    const order = queueItem?.order_product?.order || queueItem?.order || {};
    const candidates = [
        order?.status?.realStatus,
        order?.status?.real_status,
        order?.realStatus,
        order?.real_status,
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
    const ordersStore = useStore('orders');
    const displayQueueStore = useStore('display_queues');
    const websocketStore = useStore('websocket');
    const runtimeDebugStore = useStore('runtime_debug');
    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: queuesActions, getters: queuesGetters } = queuesStore;
    const { actions: ordersActions, getters: ordersGetters } = ordersStore;
    const { actions: displayQueueActions, getters: displayQueueGetters } = displayQueueStore;
    const runtimeDebugActions = runtimeDebugStore.actions;
    const queueMessages = queuesGetters?.messages;
    const orderMessages = ordersGetters?.messages;
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
    const ordersRef = useRef({
        status_in: [],
        status_working: [],
        status_out: [],
    });
    const queueBindingsRef = useRef({
        queueIds: [],
        inIds: [],
        workingIds: [],
        outIds: [],
        statusIn: null,
        statusWorking: null,
        statusOut: null,
    });
    const requestQueueRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const previousSocketConnectedRef = useRef(websocketConnected);
    const autoStartingIdsRef = useRef(new Set());
    const applyLocalQueueTransitionRef = useRef(() => {});

    useEffect(() => {
        queueBindingsRef.current = {
            queueIds: [],
            inIds: [],
            workingIds: [],
            outIds: [],
            statusIn: null,
            statusWorking: null,
            statusOut: null,
        };
        requestQueueRef.current = null;
        requestInFlightRef.current = false;
        autoStartingIdsRef.current = new Set();
    }, [currentCompany?.id, displayId]);

    const getResponsiveItemsPerPage = () => 6;

    // 🔥 AUTO START (mantido)
    useEffect(() => {
        const autoStart = async () => {
            const itensPerPage = getResponsiveItemsPerPage();

            if (isSaving) return;
            if (!loaded.status_working) return;
            if (!loaded.status_in) return;
            if (!statusWorking?.['@id']) return;
            if (!orders.status_in.length) return;
            if (totals.status_working >= itensPerPage) return;
            if (totals.status_in === 0) return;

            const pendingAutoStarts = autoStartingIdsRef.current;
            const visibleInIds = new Set(
                (Array.isArray(orders.status_in) ? orders.status_in : [])
                    .map(order => Number(order?.id || 0))
                    .filter(Boolean)
            );
            pendingAutoStarts.forEach(id => {
                if (!visibleInIds.has(id)) {
                    pendingAutoStarts.delete(id);
                }
            });

            const needed = itensPerPage - totals.status_working;
            const ordersToStart = orders.status_in
                .filter(order => {
                    const orderId = Number(order?.id || 0);
                    return orderId > 0 && !pendingAutoStarts.has(orderId);
                })
                .slice(0, needed);

            if (!ordersToStart.length) return;

            ordersToStart.forEach(order => {
                const orderId = Number(order?.id || 0);
                if (orderId > 0) {
                    pendingAutoStarts.add(orderId);
                }
            });

            for (const order of ordersToStart) {
                const orderId = Number(order?.id || 0);
                try {
                    const updatedQueueItem = await actions.save({
                        id: order.id,
                        status: statusWorking['@id'],
                    });
                    applyLocalQueueTransitionRef.current(updatedQueueItem, 'status_in', 'status_working');
                    if (orderId > 0) {
                        pendingAutoStarts.delete(orderId);
                    }
                } catch (e) {
                    if (orderId > 0) {
                        pendingAutoStarts.delete(orderId);
                    }
                }
            }
        };

        autoStart();
    }, [actions, isSaving, loaded.status_in, loaded.status_working, orders.status_in, statusWorking, totals.status_in, totals.status_working]);

    // 🔥 REQUEST SEM FLICKER
    const noteRefresh = useCallback((source, detail = '') => {
        const updatedAt = new Date().toISOString();
        setRefreshDebug({
            lastAt: updatedAt,
            lastSource: source || 'manual',
            lastDetail: detail || '',
        });
        runtimeDebugActions.setFooterEntry({
            key: 'screen-refresh',
            order: 20,
            updatedAt,
            lines: [
                `ultimo refresh: ${formatDebugClock(updatedAt)} | origem: ${source || 'manual'}${detail ? ` (${detail})` : ''}`,
            ],
        });
    }, [runtimeDebugActions]);

    useEffect(() => {
        return () => {
            runtimeDebugActions.clearFooterEntry('screen-refresh');
        };
    }, [runtimeDebugActions]);

    const applyQueueSnapshot = useCallback((nextQueueState, { markLoaded = false } = {}) => {
        const normalizedQueueState = {
            status_in: Array.isArray(nextQueueState?.status_in) ? nextQueueState.status_in : [],
            status_working: Array.isArray(nextQueueState?.status_working) ? nextQueueState.status_working : [],
            status_out: Array.isArray(nextQueueState?.status_out) ? nextQueueState.status_out : [],
        };

        ordersRef.current = normalizedQueueState;
        setOrders(normalizedQueueState);
        setTotals({
            status_in: normalizedQueueState.status_in.length,
            status_working: normalizedQueueState.status_working.length,
            status_out: normalizedQueueState.status_out.length,
        });

        if (markLoaded) {
            setLoaded({
                status_in: true,
                status_working: true,
                status_out: true,
            });
        }
    }, []);

    const applyLocalQueueTransition = useCallback((updatedQueueItem, fromStage, toStage) => {
        const queueItemId = parseEntityId(updatedQueueItem?.id || updatedQueueItem?.['@id']);
        if (!queueItemId) {
            return;
        }

        const currentQueueState = ordersRef.current || {
            status_in: [],
            status_working: [],
            status_out: [],
        };

        const previousQueueItem = [
            ...(Array.isArray(currentQueueState.status_in) ? currentQueueState.status_in : []),
            ...(Array.isArray(currentQueueState.status_working) ? currentQueueState.status_working : []),
            ...(Array.isArray(currentQueueState.status_out) ? currentQueueState.status_out : []),
        ].find(item => parseEntityId(item?.id || item?.['@id']) === queueItemId);

        const nextQueueItem = previousQueueItem
            ? {
                ...previousQueueItem,
                ...updatedQueueItem,
                order_product: updatedQueueItem?.order_product || previousQueueItem?.order_product,
                queue: updatedQueueItem?.queue || previousQueueItem?.queue,
                status: updatedQueueItem?.status || previousQueueItem?.status,
            }
            : updatedQueueItem;

        const nextQueueState = {
            status_in: (Array.isArray(currentQueueState.status_in) ? currentQueueState.status_in : []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId
            ),
            status_working: (Array.isArray(currentQueueState.status_working) ? currentQueueState.status_working : []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId
            ),
            status_out: (Array.isArray(currentQueueState.status_out) ? currentQueueState.status_out : []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId
            ),
        };

        const normalizedOriginStage = normalizeText(fromStage);
        const normalizedTargetStage = normalizeText(toStage);
        if (normalizedOriginStage && !normalizedTargetStage) {
            applyQueueSnapshot(nextQueueState);
            return;
        }

        if (
            normalizedTargetStage &&
            Array.isArray(nextQueueState[normalizedTargetStage]) &&
            isDisplayVisibleQueueItem(nextQueueItem)
        ) {
            nextQueueState[normalizedTargetStage] = [
                nextQueueItem,
                ...nextQueueState[normalizedTargetStage],
            ];
        }

        applyQueueSnapshot(nextQueueState);
    }, [applyQueueSnapshot]);

    useEffect(() => {
        applyLocalQueueTransitionRef.current = applyLocalQueueTransition;
    }, [applyLocalQueueTransition]);

    const resolveQueueBindings = useCallback(async (forceRefresh = false) => {
        if (!currentCompany?.id || !displayId) {
            return {
                queueIds: [],
                inIds: [],
                workingIds: [],
                outIds: [],
                statusIn: null,
                statusWorking: null,
                statusOut: null,
            };
        }

        if (!forceRefresh && queueBindingsRef.current.queueIds.length > 0) {
            return queueBindingsRef.current;
        }

        const result = await displayQueueActions.getItems({ display: displayId });
        const inIds = [];
        const workingIds = [];
        const outIds = [];
        const queueIds = [];

        let statusIn = null;
        let statusWorking = null;
        let statusOut = null;

        (Array.isArray(result) ? result : []).forEach(item => {
            if (item?.queue?.id) {
                queueIds.push(item.queue.id);
            }

            if (item?.queue?.status_in) {
                inIds.push(item.queue.status_in.id);
                statusIn = statusIn || item.queue.status_in;
            }
            if (item?.queue?.status_working) {
                workingIds.push(item.queue.status_working.id);
                statusWorking = statusWorking || item.queue.status_working;
            }
            if (item?.queue?.status_out) {
                outIds.push(item.queue.status_out.id);
                statusOut = statusOut || item.queue.status_out;
            }
        });

        const nextBindings = {
            queueIds: [...new Set(queueIds.filter(Boolean))],
            inIds: [...new Set(inIds.filter(Boolean))],
            workingIds: [...new Set(workingIds.filter(Boolean))],
            outIds: [...new Set(outIds.filter(Boolean))],
            statusIn,
            statusWorking,
            statusOut,
        };

        queueBindingsRef.current = nextBindings;
        return nextBindings;
    }, [currentCompany?.id, displayId, displayQueueActions]);

    const loadDisplayQueues = useCallback(async (source = 'manual', detail = '') => {
        const refreshSources = new Set(
            String(detail || '')
                .split('+')
                .map(entry => normalizeText(entry))
                .filter(Boolean)
        );
        const queueBindings = await resolveQueueBindings(
            !queueBindingsRef.current.queueIds.length ||
            source === 'focus' ||
            source === 'manual' ||
            refreshSources.has('queues') ||
            refreshSources.has('display_queues')
        );

        const [visibleInOrders, visibleWorkingOrders, visibleOutOrders] = await Promise.all([
            fetchDisplayVisibleQueueItems({
                statusIds: queueBindings.inIds,
                queueIds: queueBindings.queueIds,
                providerId: currentCompany?.id,
            }),
            fetchDisplayVisibleQueueItems({
                statusIds: queueBindings.workingIds,
                queueIds: queueBindings.queueIds,
                providerId: currentCompany?.id,
            }),
            fetchDisplayVisibleQueueItems({
                statusIds: queueBindings.outIds,
                queueIds: queueBindings.queueIds,
                providerId: currentCompany?.id,
            }),
        ]);

        applyQueueSnapshot({
            status_in: visibleInOrders,
            status_working: visibleWorkingOrders,
            status_out: visibleOutOrders,
        }, { markLoaded: true });

        setStatusIn(queueBindings.statusIn);
        setStatusWorking(queueBindings.statusWorking);
        setStatusOut(queueBindings.statusOut);
        noteRefresh(source, detail);
    }, [applyQueueSnapshot, currentCompany?.id, noteRefresh, resolveQueueBindings]);

    const onRequest = useCallback(async (source = 'manual', detail = '') => {
        if (!currentCompany?.id || !displayId) {
            return;
        }

        requestQueueRef.current = { source, detail };
        if (requestInFlightRef.current) {
            return;
        }

        requestInFlightRef.current = true;
        try {
            while (requestQueueRef.current) {
                const nextRequest = requestQueueRef.current;
                requestQueueRef.current = null;

                try {
                    await loadDisplayQueues(
                        nextRequest?.source || 'manual',
                        nextRequest?.detail || ''
                    );
                } catch (e) {
                    // O proximo evento do socket pode reidratar a tela.
                }
            }
        } finally {
            requestInFlightRef.current = false;
        }
    }, [currentCompany?.id, displayId, loadDisplayQueues]);

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

    const hasOrderRefreshMessage = useMemo(
        () =>
            (Array.isArray(orderMessages) ? orderMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id)
            ),
        [currentCompany?.id, orderMessages]
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
                !hasOrderRefreshMessage &&
                !hasDisplayQueueRefreshMessage &&
                !hasOrderProductQueueRefreshMessage)
        ) {
            return;
        }

        queuesActions.setMessages(removeConsumedMessages(queueMessages, currentCompany?.id));
        ordersActions.setMessages(removeConsumedMessages(orderMessages, currentCompany?.id));
        displayQueueActions.setMessages(removeConsumedMessages(displayQueueMessages, currentCompany?.id));
        actions.setMessages(removeConsumedMessages(orderProductQueueMessages, currentCompany?.id));
        const refreshSources = [
            hasQueueRefreshMessage ? 'queues' : '',
            hasOrderRefreshMessage ? 'orders' : '',
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
        hasOrderRefreshMessage,
        hasQueueRefreshMessage,
        hasDisplayQueueRefreshMessage,
        hasOrderProductQueueRefreshMessage,
        isSaving,
        onRequest,
        orderMessages,
        ordersActions,
        orderProductQueueMessages,
        queueMessages,
        queuesActions,
    ]);

    // 🔥 PRIMEIRA CARGA
    useEffect(() => {
        const wasConnected = previousSocketConnectedRef.current;
        previousSocketConnectedRef.current = websocketConnected;

        if (websocketConnected && !wasConnected && currentCompany?.id) {
            onRequest('socket', 'reconnected-sync');
        }
    }, [currentCompany?.id, onRequest, websocketConnected]);

    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id) return undefined;
            onRequest('focus', 'screen-focus');
            return undefined;
        }, [currentCompany?.id, onRequest])
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
                        onTransition={applyLocalQueueTransition}
                        onPrint={handlePrintQueueItem}
                        ppcColorsOverride={ppcColors}
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
                            onTransition={applyLocalQueueTransition}
                            onPrint={handlePrintQueueItem}
                            ppcColorsOverride={ppcColors}
                        />
                    )}

                    {modalType === 'out' && (
                        <InOut
                            orders={orders.status_out}
                            total={totals.status_out}
                            status_in={statusOut}
                            onTransition={applyLocalQueueTransition}
                            onPrint={handlePrintQueueItem}
                            ppcColorsOverride={ppcColors}
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
