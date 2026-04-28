import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useStore } from '@store';
import {
    DISPLAY_DEVICE_LINK_CONFIG_KEY,
    resolvePrintDeviceConfig,
} from '@controleonline/ui-common/src/react/print/selection';
import {
    PRINT_CONTEXT_DISPLAY,
} from '@controleonline/ui-common/src/react/print/jobs';
import {
    parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import InOut from './Status/InOut';
import Working from './Status/Working';
import createStyles from './index.styles';
import DateShortcutFilter from '@controleonline/ui-common/src/react/components/filters/DateShortcutFilter';
import {
    DEFAULT_DATE_FILTER_KEY,
    getDateRange,
} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import RealtimeDebugBar from '@controleonline/ui-ppc/src/react/components/RealtimeDebugBar';
import DisplayAutoPrintDispatcher from './DisplayAutoPrintDispatcher';
import {
    appendPendingAutoPrintJob,
    isDisplayAutoPrintEnabled,
    removePendingAutoPrintJob,
    shouldAutoPrintTransition,
} from './autoPrint';

const STAGE_KEYS = ['status_in', 'status_working', 'status_out'];
const WORKING_TAB_INDEX = 1;
const TAB_ROUTES = [
    { key: 'status_in', title: 'Fila' },
    { key: 'status_working', title: 'Prep' },
    { key: 'status_out', title: 'Pronto' },
];
const WORKING_TARGET_ITEMS = 6;
const displayDateFilterCache = new Map();
const createEmptyCustomDateRange = () => ({ from: '', to: '' });

const createEmptyOrders = () => ({
    status_in: [],
    status_working: [],
    status_out: [],
});

const createEmptyCounters = () => ({
    status_in: 0,
    status_working: 0,
    status_out: 0,
});

const createEmptyLoaded = () => ({
    status_in: false,
    status_working: false,
    status_out: false,
});

const createEmptyBindings = () => ({
    queueIds: [],
    inIds: [],
    workingIds: [],
    outIds: [],
    statusIn: null,
    statusWorking: null,
    statusOut: null,
});

const formatDebugClock = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    const pad = entry => String(entry).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
        message => !isMessageForCompany(message, companyId),
    );

const DisplayProducts = ({ display = {} }) => {
    const route = useRoute();

    const displayId = decodeURIComponent(
        route.params?.id ||
        (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('id') || ''
            : ''),
    );

    const peopleStore = useStore('people');
    const queuesStore = useStore('queues');
    const ordersStore = useStore('orders');
    const displayQueueStore = useStore('display_queues');
    const deviceConfigStore = useStore('device_config');
    const deviceStore = useStore('device');
    const websocketStore = useStore('websocket');
    const runtimeDebugStore = useStore('runtime_debug');
    const orderProductQueueStore = useStore('order_products_queue');

    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const { currentCompany } = peopleStore.getters;
    const { actions: queuesActions, getters: queuesGetters } = queuesStore;
    const { actions: ordersActions, getters: ordersGetters } = ordersStore;
    const { actions: displayQueueActions, getters: displayQueueGetters } = displayQueueStore;
    const {
        item: runtimeDeviceConfig,
        items: companyDeviceConfigs = [],
    } = deviceConfigStore.getters;
    const { item: currentDevice } = deviceStore.getters;
    const runtimeDebugActions = runtimeDebugStore.actions;
    const orderProductQueueActions = orderProductQueueStore.actions;
    const {
        isSaving,
        messages: orderProductQueueMessages,
    } = orderProductQueueStore.getters;

    const queueMessages = queuesGetters?.messages;
    const orderMessages = ordersGetters?.messages;
    const displayQueueMessages = displayQueueGetters?.messages;
    const websocketStatus = websocketStore?.getters?.summary || {};
    const websocketConnected = Boolean(websocketStatus?.connected);

    const [tabIndex, setTabIndex] = useState(WORKING_TAB_INDEX);
    const [queueBindings, setQueueBindings] = useState(createEmptyBindings);
    const [orders, setOrders] = useState(createEmptyOrders);
    const [totals, setTotals] = useState(createEmptyCounters);
    const [loaded, setLoaded] = useState(createEmptyLoaded);
    const [dateFilterKey, setDateFilterKey] = useState(DEFAULT_DATE_FILTER_KEY);
    const [customDateRange, setCustomDateRange] = useState(createEmptyCustomDateRange);
    const [statusRefreshTokens, setStatusRefreshTokens] = useState(createEmptyCounters);
    const [bindingsRefreshToken, setBindingsRefreshToken] = useState(0);
    const [autoStartingCount, setAutoStartingCount] = useState(0);
    const [pendingAutoPrintJobIds, setPendingAutoPrintJobIds] = useState([]);
    const [refreshDebug, setRefreshDebug] = useState({
        lastAt: null,
        lastSource: 'boot',
        lastDetail: 'startup',
    });

    const ordersRef = useRef(createEmptyOrders());
    const previousSocketConnectedRef = useRef(websocketConnected);
    const autoStartingIdsRef = useRef(new Set());
    const applyLocalQueueTransitionRef = useRef(() => {});
    const socketRefreshTimeoutRef = useRef(null);
    const hasHydratedStatusesRef = useRef(false);
    const filterCacheKey = useMemo(
        () => (
            currentCompany?.id && displayId
                ? `display-products:${currentCompany.id}:${displayId}`
                : ''
        ),
        [currentCompany?.id, displayId],
    );

    useEffect(() => {
        ordersRef.current = createEmptyOrders();
        setOrders(createEmptyOrders());
        setTotals(createEmptyCounters());
        setLoaded(createEmptyLoaded());
        setQueueBindings(createEmptyBindings());
        setStatusRefreshTokens(createEmptyCounters());
        setBindingsRefreshToken(0);
        setAutoStartingCount(0);
        setPendingAutoPrintJobIds([]);
        setTabIndex(WORKING_TAB_INDEX);
        autoStartingIdsRef.current = new Set();
        hasHydratedStatusesRef.current = false;

        if (socketRefreshTimeoutRef.current) {
            clearTimeout(socketRefreshTimeoutRef.current);
            socketRefreshTimeoutRef.current = null;
        }

        if (!filterCacheKey) {
            setDateFilterKey(DEFAULT_DATE_FILTER_KEY);
            setCustomDateRange(createEmptyCustomDateRange());
            return;
        }

        const cachedFilter = displayDateFilterCache.get(filterCacheKey);

        setDateFilterKey(cachedFilter?.dateFilterKey || DEFAULT_DATE_FILTER_KEY);
        setCustomDateRange(
            cachedFilter?.customDateRange || createEmptyCustomDateRange(),
        );
    }, [filterCacheKey]);

    useEffect(() => {
        if (!filterCacheKey) {
            return;
        }

        displayDateFilterCache.set(filterCacheKey, {
            dateFilterKey,
            customDateRange: {
                from: String(customDateRange?.from || ''),
                to: String(customDateRange?.to || ''),
            },
        });
    }, [customDateRange?.from, customDateRange?.to, dateFilterKey, filterCacheKey]);

    const dateRange = useMemo(
        () => getDateRange(dateFilterKey, customDateRange),
        [customDateRange, dateFilterKey],
    );
    const runtimeDisplayConfig = useMemo(() => {
        if (!runtimeDeviceConfig) {
            return null;
        }

        const runtimeConfigs = parseConfigsObject(runtimeDeviceConfig?.configs);
        const runtimeDisplayId = parseEntityId(
            runtimeConfigs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY],
        );
        const currentDisplayId = parseEntityId(display?.id || displayId);
        const runtimeDeviceId = parseEntityId(
            runtimeDeviceConfig?.device?.device || runtimeDeviceConfig?.device?.id,
        );
        const currentRuntimeDeviceId = parseEntityId(
            currentDevice?.id || currentDevice?.device,
        );
        const runtimeCompanyId = parseEntityId(
            runtimeDeviceConfig?.people?.id || runtimeDeviceConfig?.people,
        );
        const currentCompanyId = parseEntityId(currentCompany?.id);
        const runtimeType = String(
            runtimeDeviceConfig?.type || runtimeDeviceConfig?.device?.type || '',
        )
            .trim()
            .toUpperCase();

        if (
            currentDisplayId &&
            runtimeDisplayId &&
            currentDisplayId !== runtimeDisplayId
        ) {
            return null;
        }

        if (
            currentRuntimeDeviceId &&
            runtimeDeviceId &&
            currentRuntimeDeviceId !== runtimeDeviceId
        ) {
            return null;
        }

        if (
            currentCompanyId &&
            runtimeCompanyId &&
            currentCompanyId !== runtimeCompanyId
        ) {
            return null;
        }

        if (runtimeType && runtimeType !== 'DISPLAY') {
            return null;
        }

        return {
            ...runtimeDeviceConfig,
            configs: runtimeConfigs,
        };
    }, [
        currentCompany?.id,
        currentDevice?.device,
        currentDevice?.id,
        display?.id,
        displayId,
        runtimeDeviceConfig,
    ]);
    const displayPrintConfig = useMemo(
        () =>
            resolvePrintDeviceConfig({
                contextType: PRINT_CONTEXT_DISPLAY,
                companyDeviceConfigs,
                currentCompanyId: currentCompany?.id,
                currentDeviceId: currentDevice?.id || currentDevice?.device,
                displayId: display?.id || displayId,
                runtimeDeviceConfig,
            }) || runtimeDisplayConfig,
        [
            companyDeviceConfigs,
            currentCompany?.id,
            currentDevice?.device,
            currentDevice?.id,
            display?.id,
            displayId,
            runtimeDeviceConfig,
            runtimeDisplayConfig,
        ],
    );
    const displayAutoPrintEnabled = useMemo(
        () => isDisplayAutoPrintEnabled(displayPrintConfig),
        [displayPrintConfig],
    );
    const displayedTotals = useMemo(() => {
        const reservedAutoStarts = Number(autoStartingCount || 0);

        return {
            ...totals,
            status_in: Math.max(0, Number(totals.status_in || 0) - reservedAutoStarts),
            status_working: Number(totals.status_working || 0) + reservedAutoStarts,
        };
    }, [autoStartingCount, totals]);

    const syncAutoStartingIds = useCallback(updater => {
        const nextIds = new Set(autoStartingIdsRef.current || new Set());

        updater(nextIds);

        autoStartingIdsRef.current = nextIds;
        setAutoStartingCount(nextIds.size);
        return nextIds;
    }, []);

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

    useEffect(() => () => {
        runtimeDebugActions.clearFooterEntry('screen-refresh');
        if (socketRefreshTimeoutRef.current) {
            clearTimeout(socketRefreshTimeoutRef.current);
            socketRefreshTimeoutRef.current = null;
        }
    }, [runtimeDebugActions]);

    const resolveQueueBindings = useCallback(async () => {
        if (!currentCompany?.id || !displayId) {
            return createEmptyBindings();
        }

        const result = await displayQueueActions.getItems({
            display: displayId,
            itemsPerPage: 1000,
            pagination: false,
        });

        const queueIds = [];
        const inIds = [];
        const workingIds = [];
        const outIds = [];

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

        return {
            queueIds: [...new Set(queueIds.filter(Boolean))],
            inIds: [...new Set(inIds.filter(Boolean))],
            workingIds: [...new Set(workingIds.filter(Boolean))],
            outIds: [...new Set(outIds.filter(Boolean))],
            statusIn,
            statusWorking,
            statusOut,
        };
    }, [currentCompany?.id, displayId, displayQueueActions]);

    useEffect(() => {
        if (!currentCompany?.id || !displayId) {
            return undefined;
        }

        let cancelled = false;

        resolveQueueBindings()
            .then(nextBindings => {
                if (!cancelled) {
                    setQueueBindings(nextBindings);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setQueueBindings(createEmptyBindings());
                }
            });

        return () => {
            cancelled = true;
        };
    }, [bindingsRefreshToken, currentCompany?.id, displayId, resolveQueueBindings]);

    const bumpStageRefreshTokens = useCallback((stages = STAGE_KEYS) => {
        setStatusRefreshTokens(currentTokens => {
            const nextTokens = { ...currentTokens };
            stages.forEach(stage => {
                if (!stage) {
                    return;
                }

                nextTokens[stage] = Number(nextTokens[stage] || 0) + 1;
            });
            return nextTokens;
        });
    }, []);

    const requestRefresh = useCallback((source = 'manual', detail = '', {
        refreshBindings = false,
        stages = STAGE_KEYS,
        switchToWorking = false,
    } = {}) => {
        if (!currentCompany?.id) {
            return;
        }

        noteRefresh(source, detail);

        if (switchToWorking) {
            setTabIndex(WORKING_TAB_INDEX);
        }

        if (refreshBindings) {
            setBindingsRefreshToken(currentValue => currentValue + 1);
            return;
        }

        bumpStageRefreshTokens(stages);
    }, [bumpStageRefreshTokens, currentCompany?.id, noteRefresh]);

    const handleStageSnapshot = useCallback((stage, snapshot = {}) => {
        const nextItems = Array.isArray(snapshot.items) ? snapshot.items : [];
        const nextTotal = Number(snapshot.total || 0);
        const nextLoaded = Boolean(snapshot.loaded);

        setOrders(currentOrders => {
            const nextOrders = {
                ...currentOrders,
                [stage]: nextItems,
            };
            ordersRef.current = nextOrders;
            return nextOrders;
        });

        setTotals(currentTotals => ({
            ...currentTotals,
            [stage]: nextTotal,
        }));

        setLoaded(currentLoaded => ({
            ...currentLoaded,
            [stage]: nextLoaded,
        }));

        if (nextLoaded) {
            hasHydratedStatusesRef.current = true;
        }
    }, []);

    const handleInSnapshot = useCallback(
        snapshot => handleStageSnapshot('status_in', snapshot),
        [handleStageSnapshot],
    );

    const handleWorkingSnapshot = useCallback(
        snapshot => handleStageSnapshot('status_working', snapshot),
        [handleStageSnapshot],
    );

    const handleOutSnapshot = useCallback(
        snapshot => handleStageSnapshot('status_out', snapshot),
        [handleStageSnapshot],
    );

    const applyLocalQueueTransition = useCallback((updatedQueueItem, fromStage, toStage) => {
        const queueItemId = parseEntityId(updatedQueueItem?.id || updatedQueueItem?.['@id']);
        if (!queueItemId) {
            return;
        }

        const currentQueueState = ordersRef.current || createEmptyOrders();
        const previousQueueItem = STAGE_KEYS
            .flatMap(stage => currentQueueState?.[stage] || [])
            .find(item => parseEntityId(item?.id || item?.['@id']) === queueItemId);

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
            status_in: (currentQueueState.status_in || []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId,
            ),
            status_working: (currentQueueState.status_working || []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId,
            ),
            status_out: (currentQueueState.status_out || []).filter(
                item => parseEntityId(item?.id || item?.['@id']) !== queueItemId,
            ),
        };

        if (toStage && Array.isArray(nextQueueState[toStage])) {
            nextQueueState[toStage] = [
                nextQueueItem,
                ...nextQueueState[toStage],
            ];
        }

        ordersRef.current = nextQueueState;
        setOrders(nextQueueState);
        setTotals(currentTotals => {
            const nextTotals = { ...currentTotals };

            if (fromStage && Object.prototype.hasOwnProperty.call(nextTotals, fromStage)) {
                nextTotals[fromStage] = Math.max(0, Number(nextTotals[fromStage] || 0) - 1);
            }

            if (toStage && Object.prototype.hasOwnProperty.call(nextTotals, toStage)) {
                nextTotals[toStage] = Number(nextTotals[toStage] || 0) + 1;
            }

            return nextTotals;
        });

        setTabIndex(WORKING_TAB_INDEX);
        bumpStageRefreshTokens([fromStage, toStage].filter(Boolean));
    }, [bumpStageRefreshTokens]);

    useEffect(() => {
        applyLocalQueueTransitionRef.current = applyLocalQueueTransition;
    }, [applyLocalQueueTransition]);

    const handleQueueTransition = useCallback((updatedQueueItem, fromStage, toStage) => {
        applyLocalQueueTransition(updatedQueueItem, fromStage, toStage);

        if (
            shouldAutoPrintTransition({
                autoPrintEnabled: displayAutoPrintEnabled,
                fromStage,
                toStage,
            })
        ) {
            setPendingAutoPrintJobIds(currentJobs =>
                appendPendingAutoPrintJob(currentJobs, updatedQueueItem),
            );
        }
    }, [applyLocalQueueTransition, displayAutoPrintEnabled]);

    useEffect(() => {
        applyLocalQueueTransitionRef.current = handleQueueTransition;
    }, [handleQueueTransition]);

    const saveQueueItem = useCallback(
        payload => orderProductQueueActions.save(payload),
        [orderProductQueueActions],
    );

    const handleAutoPrintSettled = useCallback(queueItemId => {
        setPendingAutoPrintJobIds(currentJobs =>
            removePendingAutoPrintJob(currentJobs, queueItemId),
        );
    }, []);

    useEffect(() => {
        const autoStart = async () => {
            if (isSaving) return;
            if (!loaded.status_working || !loaded.status_in) return;
            if (!queueBindings.statusWorking?.['@id']) return;
            if (!orders.status_in.length) return;
            if (totals.status_in === 0) return;

            let pendingAutoStarts = autoStartingIdsRef.current;
            const visibleInIds = new Set(
                orders.status_in
                    .map(order => Number(order?.id || 0))
                    .filter(Boolean),
            );

            pendingAutoStarts = syncAutoStartingIds(nextIds => {
                nextIds.forEach(id => {
                    if (!visibleInIds.has(id)) {
                        nextIds.delete(id);
                    }
                });
            });

            const effectiveWorkingTotal =
                Number(totals.status_working || 0) + pendingAutoStarts.size;
            const effectiveInTotal = Math.max(
                0,
                Number(totals.status_in || 0) - pendingAutoStarts.size,
            );

            if (effectiveWorkingTotal >= WORKING_TARGET_ITEMS) return;
            if (effectiveInTotal === 0) return;

            const needed = WORKING_TARGET_ITEMS - effectiveWorkingTotal;
            const ordersToStart = orders.status_in
                .filter(order => {
                    const orderId = Number(order?.id || 0);
                    return orderId > 0 && !pendingAutoStarts.has(orderId);
                })
                .slice(0, needed);

            if (!ordersToStart.length) return;

            syncAutoStartingIds(nextIds => {
                ordersToStart.forEach(order => {
                    const orderId = Number(order?.id || 0);
                    if (orderId > 0) {
                        nextIds.add(orderId);
                    }
                });
            });

            for (const order of ordersToStart) {
                const orderId = Number(order?.id || 0);

                try {
                    const updatedQueueItem = await orderProductQueueActions.save({
                        id: order.id,
                        status: queueBindings.statusWorking['@id'],
                    });

                    applyLocalQueueTransitionRef.current(
                        updatedQueueItem,
                        'status_in',
                        'status_working',
                    );
                    syncAutoStartingIds(nextIds => {
                        nextIds.delete(orderId);
                    });
                } catch {
                    syncAutoStartingIds(nextIds => {
                        nextIds.delete(orderId);
                    });
                }
            }
        };

        autoStart();
    }, [
        autoStartingCount,
        isSaving,
        loaded.status_in,
        loaded.status_working,
        orderProductQueueActions,
        orders.status_in,
        queueBindings.statusWorking,
        syncAutoStartingIds,
        totals.status_in,
        totals.status_working,
    ]);

    const hasQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(queueMessages) ? queueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id),
            ),
        [currentCompany?.id, queueMessages],
    );

    const hasDisplayQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(displayQueueMessages) ? displayQueueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id),
            ),
        [currentCompany?.id, displayQueueMessages],
    );

    const hasOrderRefreshMessage = useMemo(
        () =>
            (Array.isArray(orderMessages) ? orderMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id),
            ),
        [currentCompany?.id, orderMessages],
    );

    const hasOrderProductQueueRefreshMessage = useMemo(
        () =>
            (Array.isArray(orderProductQueueMessages) ? orderProductQueueMessages : []).some(message =>
                isMessageForCompany(message, currentCompany?.id),
            ),
        [currentCompany?.id, orderProductQueueMessages],
    );

    useEffect(() => {
        if (
            !hasHydratedStatusesRef.current ||
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
        orderProductQueueActions.setMessages(
            removeConsumedMessages(orderProductQueueMessages, currentCompany?.id),
        );

        const refreshSources = [
            hasQueueRefreshMessage ? 'queues' : '',
            hasOrderRefreshMessage ? 'orders' : '',
            hasDisplayQueueRefreshMessage ? 'display_queues' : '',
            hasOrderProductQueueRefreshMessage ? 'order_products_queue' : '',
        ].filter(Boolean);

        if (socketRefreshTimeoutRef.current) {
            clearTimeout(socketRefreshTimeoutRef.current);
        }

        socketRefreshTimeoutRef.current = setTimeout(() => {
            socketRefreshTimeoutRef.current = null;
            requestRefresh('socket', refreshSources.join('+'), {
                refreshBindings:
                    refreshSources.includes('queues') ||
                    refreshSources.includes('display_queues'),
                switchToWorking: true,
            });
        }, 220);
    }, [
        currentCompany?.id,
        displayQueueActions,
        displayQueueMessages,
        hasDisplayQueueRefreshMessage,
        hasOrderProductQueueRefreshMessage,
        hasOrderRefreshMessage,
        hasQueueRefreshMessage,
        isSaving,
        orderMessages,
        orderProductQueueActions,
        orderProductQueueMessages,
        ordersActions,
        queueMessages,
        queuesActions,
        requestRefresh,
    ]);

    useEffect(() => {
        const wasConnected = previousSocketConnectedRef.current;
        previousSocketConnectedRef.current = websocketConnected;

        if (
            websocketConnected &&
            !wasConnected &&
            currentCompany?.id &&
            hasHydratedStatusesRef.current
        ) {
            requestRefresh('socket', 'reconnected-sync', {
                refreshBindings: true,
                switchToWorking: true,
            });
        }
    }, [currentCompany?.id, requestRefresh, websocketConnected]);

    useFocusEffect(
        useCallback(() => {
            if (!currentCompany?.id || !hasHydratedStatusesRef.current) {
                return undefined;
            }

            requestRefresh('focus', 'screen-focus');
            return undefined;
        }, [currentCompany?.id, requestRefresh]),
    );

    const printButtonProps = useMemo(
        () => ({
            store: 'order_products_queue',
            printerSelection: {
                enabled: true,
                context: 'display',
                display,
                displayId: display?.id,
            },
        }),
        [display],
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tabsContainer}>
                <View style={styles.filterBar}>
                    <DateShortcutFilter
                        value={dateFilterKey}
                        onChange={setDateFilterKey}
                        customRange={customDateRange}
                        onCustomRangeChange={setCustomDateRange}
                        colors={ppcColors}
                    />
                </View>

                <View style={styles.tabsCard}>
                    <View style={styles.tabBar}>
                        {TAB_ROUTES.map((tabRoute, index) => {
                            const focused = tabIndex === index;

                            return (
                                <TouchableOpacity
                                    key={tabRoute.key}
                                    activeOpacity={0.85}
                                    style={styles.tabButton}
                                    onPress={() => setTabIndex(index)}
                                >
                                    <View style={styles.tabLabelWrap}>
                                        <Text
                                            style={[
                                                styles.tabLabelTitle,
                                                focused ? styles.tabLabelTitleActive : null,
                                            ]}
                                        >
                                            {tabRoute.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.tabLabelCount,
                                                focused ? styles.tabLabelCountActive : null,
                                            ]}
                                        >
                                            {displayedTotals[tabRoute.key] || 0}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.tabIndicator,
                                            focused ? styles.tabIndicatorActive : null,
                                        ]}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.sceneContainer}>
                    <View
                        style={[
                            styles.scenePanel,
                            tabIndex === 0 ? styles.sceneVisible : styles.sceneHidden,
                        ]}
                    >
                        <InOut
                            companyId={currentCompany?.id}
                            queueBindings={queueBindings}
                            dateRange={dateRange}
                            stageKey="status_in"
                            refreshToken={statusRefreshTokens.status_in}
                            onSnapshotChange={handleInSnapshot}
                            totalOverride={displayedTotals.status_in}
                            status_working={queueBindings.statusWorking}
                            saveQueueItem={saveQueueItem}
                            onTransition={handleQueueTransition}
                            printButtonProps={printButtonProps}
                            ppcColorsOverride={ppcColors}
                        />
                    </View>

                    <View
                        style={[
                            styles.scenePanel,
                            tabIndex === WORKING_TAB_INDEX ? styles.sceneVisible : styles.sceneHidden,
                        ]}
                    >
                        <Working
                            companyId={currentCompany?.id}
                            queueBindings={queueBindings}
                            dateRange={dateRange}
                            refreshToken={statusRefreshTokens.status_working}
                            onSnapshotChange={handleWorkingSnapshot}
                            totalOverride={displayedTotals.status_working}
                            status_out={queueBindings.statusOut}
                            saveQueueItem={saveQueueItem}
                            onTransition={handleQueueTransition}
                            printButtonProps={printButtonProps}
                            ppcColorsOverride={ppcColors}
                        />
                    </View>

                    <View
                        style={[
                            styles.scenePanel,
                            tabIndex === 2 ? styles.sceneVisible : styles.sceneHidden,
                        ]}
                    >
                        <InOut
                            companyId={currentCompany?.id}
                            queueBindings={queueBindings}
                            dateRange={dateRange}
                            stageKey="status_out"
                            refreshToken={statusRefreshTokens.status_out}
                            onSnapshotChange={handleOutSnapshot}
                            totalOverride={displayedTotals.status_out}
                            saveQueueItem={saveQueueItem}
                            onTransition={handleQueueTransition}
                            printButtonProps={printButtonProps}
                            ppcColorsOverride={ppcColors}
                        />
                    </View>
                    </View>
                </View>
            </View>

            {pendingAutoPrintJobIds.length > 0 ? (
                <DisplayAutoPrintDispatcher
                    display={display}
                    displayId={display?.id || displayId}
                    queueItemIds={pendingAutoPrintJobIds}
                    onJobSettled={handleAutoPrintSettled}
                />
            ) : null}

            <RealtimeDebugBar
                companyId={currentCompany?.id}
                ppcColors={ppcColors}
                refreshState={refreshDebug}
                websocketStatus={websocketStatus}
            />
        </SafeAreaView>
    );
};

export default DisplayProducts;
