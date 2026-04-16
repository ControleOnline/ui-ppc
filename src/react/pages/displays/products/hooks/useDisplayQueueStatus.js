import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@controleonline/ui-common/src/api';

const DISPLAY_QUEUE_STATUS_PAGE_SIZE = 6;

const STAGE_STATUS_IDS_KEY = {
    status_in: 'inIds',
    status_working: 'workingIds',
    status_out: 'outIds',
};

const STAGE_STATUS_ENTITY_KEY = {
    status_in: 'statusIn',
    status_working: 'statusWorking',
    status_out: 'statusOut',
};

const STAGE_ORDER_PARAMS = {
    status_in: {
        'order[registerTime]': 'ASC',
        'order[id]': 'ASC',
    },
    status_working: {
        'order[updateTime]': 'ASC',
        'order[id]': 'ASC',
    },
    status_out: {
        'order[updateTime]': 'DESC',
        'order[id]': 'DESC',
    },
};

const getResponseItems = response => {
    if (Array.isArray(response?.member)) {
        return response.member;
    }

    if (Array.isArray(response?.['hydra:member'])) {
        return response['hydra:member'];
    }

    return Array.isArray(response) ? response : [];
};

const getResponseTotal = (response, fallbackLength) => {
    const explicitTotal =
        Number(response?.totalItems) ||
        Number(response?.['hydra:totalItems']) ||
        0;

    return explicitTotal > 0 ? explicitTotal : fallbackLength;
};

const getQueueItemKey = item =>
    String(item?.id || item?.['@id'] || '').trim();

const mergeQueueItems = (currentItems, nextItems) => {
    const merged = Array.isArray(currentItems) ? [...currentItems] : [];
    const seen = new Set(merged.map(getQueueItemKey).filter(Boolean));

    (Array.isArray(nextItems) ? nextItems : []).forEach(item => {
        const itemKey = getQueueItemKey(item);

        if (itemKey && seen.has(itemKey)) {
            return;
        }

        if (itemKey) {
            seen.add(itemKey);
        }

        merged.push(item);
    });

    return merged;
};

export const useDisplayQueueStatus = ({
    companyId,
    queueBindings = null,
    stageKey,
    dateRange = null,
    refreshToken = 0,
    enabled = true,
    itemsPerPage = DISPLAY_QUEUE_STATUS_PAGE_SIZE,
    onSnapshotChange = null,
}) => {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const pageRef = useRef(0);
    const hasMoreRef = useRef(false);
    const requestIdRef = useRef(0);

    const queueIds = useMemo(
        () => (Array.isArray(queueBindings?.queueIds) ? queueBindings.queueIds.filter(Boolean) : []),
        [queueBindings?.queueIds],
    );
    const statusIds = useMemo(() => {
        const key = STAGE_STATUS_IDS_KEY[stageKey];
        return key && Array.isArray(queueBindings?.[key])
            ? queueBindings[key].filter(Boolean)
            : [];
    }, [queueBindings, stageKey]);
    const status = useMemo(() => {
        const key = STAGE_STATUS_ENTITY_KEY[stageKey];
        return key ? queueBindings?.[key] || null : null;
    }, [queueBindings, stageKey]);
    const orderParams = useMemo(
        () => STAGE_ORDER_PARAMS[stageKey] || STAGE_ORDER_PARAMS.status_in,
        [stageKey],
    );

    const resetSnapshot = useCallback((markLoaded = false) => {
        requestIdRef.current += 1;
        pageRef.current = 0;
        hasMoreRef.current = false;
        setItems([]);
        setTotal(0);
        setLoaded(markLoaded);
        setLoadingInitial(false);
        setLoadingMore(false);
    }, []);

    const loadPage = useCallback(async (page = 1, { append = false } = {}) => {
        if (!enabled || !companyId || !queueIds.length || !statusIds.length) {
            resetSnapshot(Boolean(enabled && companyId));
            return {
                items: [],
                total: 0,
                page: 0,
                hasMore: false,
            };
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        if (page === 1 && !append) {
            setLoadingInitial(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await api.fetch('order_product_queues', {
                params: {
                    status: statusIds,
                    itemsPerPage,
                    page,
                    ...orderParams,
                    ...(dateRange?.after ? { 'registerTime[after]': dateRange.after } : {}),
                    ...(dateRange?.before ? { 'registerTime[before]': dateRange.before } : {}),
                    'order_product.order.provider': companyId,
                    queue: queueIds,
                },
            });

            if (requestId !== requestIdRef.current) {
                return null;
            }

            const nextItems = getResponseItems(response);
            const nextTotal = getResponseTotal(response, nextItems.length);
            const nextHasMore = page * itemsPerPage < nextTotal;

            pageRef.current = page;
            hasMoreRef.current = nextHasMore;

            setItems(currentItems =>
                append ? mergeQueueItems(currentItems, nextItems) : nextItems
            );
            setTotal(nextTotal);
            setLoaded(true);

            return {
                items: nextItems,
                total: nextTotal,
                page,
                hasMore: nextHasMore,
            };
        } catch (error) {
            if (requestId === requestIdRef.current) {
                setLoaded(true);
            }
            throw error;
        } finally {
            if (requestId === requestIdRef.current) {
                setLoadingInitial(false);
                setLoadingMore(false);
            }
        }
    }, [companyId, dateRange?.after, dateRange?.before, enabled, itemsPerPage, orderParams, queueIds, resetSnapshot, statusIds]);

    const reload = useCallback(() => loadPage(1), [loadPage]);

    const loadMore = useCallback(() => {
        if (
            !enabled ||
            loadingInitial ||
            loadingMore ||
            !loaded ||
            !hasMoreRef.current
        ) {
            return Promise.resolve(null);
        }

        return loadPage(pageRef.current + 1, { append: true });
    }, [enabled, loadPage, loaded, loadingInitial, loadingMore]);

    useEffect(() => {
        if (!enabled) {
            resetSnapshot(false);
            return undefined;
        }

        if (!companyId) {
            resetSnapshot(false);
            return undefined;
        }

        if (!queueIds.length || !statusIds.length) {
            resetSnapshot(true);
            return undefined;
        }

        let cancelled = false;

        loadPage(1).catch(() => {
            if (!cancelled) {
                resetSnapshot(true);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [companyId, dateRange?.after, dateRange?.before, enabled, loadPage, queueBindings, refreshToken, resetSnapshot, queueIds.length, statusIds.length]);

    useEffect(() => {
        if (typeof onSnapshotChange !== 'function') {
            return;
        }

        onSnapshotChange({
            items,
            total,
            loaded,
            status,
            loadingInitial,
            loadingMore,
            hasMore: hasMoreRef.current,
        });
    }, [items, loaded, loadingInitial, loadingMore, onSnapshotChange, status, total]);

    return {
        items,
        total,
        loaded,
        loadingInitial,
        loadingMore,
        hasMore: hasMoreRef.current,
        status,
        loadMore,
        reload,
    };
};

export default useDisplayQueueStatus;
