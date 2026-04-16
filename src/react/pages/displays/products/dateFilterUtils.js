const pad2 = value => String(value).padStart(2, '0');

const formatDateToApi = date =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

const formatTranslationKey = key => {
    if (!key) {
        return '';
    }

    return String(key)
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/^\w/, character => character.toUpperCase());
};

const resolveOrderLabel = (key, fallback) => {
    const translated = global.t?.t('orders', 'label', key);
    const normalizedTranslated =
        typeof translated === 'string' ? translated.trim() : '';
    const normalizedFallback =
        typeof fallback === 'string' ? fallback.trim() : '';
    const formattedKey = formatTranslationKey(key);

    if (
        normalizedTranslated &&
        normalizedTranslated !== key &&
        normalizedTranslated !== formattedKey
    ) {
        return normalizedTranslated;
    }

    if (normalizedFallback) {
        global.t?.findMessage?.('orders', 'label', key, normalizedFallback);
        global.t?.persistMissingTranslate?.(
            'orders',
            'label',
            key,
            normalizedFallback,
        );
        return normalizedFallback;
    }

    return formattedKey;
};

const createDayStart = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const createDayEnd = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const formatDateLabel = date => date.toLocaleDateString('pt-BR');

const resolveDateObjectsRange = (dateFilterKey, baseDate = new Date()) => {
    const now = new Date(baseDate);

    if (dateFilterKey === 'today') {
        return {
            afterDate: createDayStart(now),
            beforeDate: createDayEnd(now),
        };
    }

    if (dateFilterKey === '7d') {
        const start = createDayStart(now);
        start.setDate(start.getDate() - 6);

        return {
            afterDate: start,
            beforeDate: createDayEnd(now),
        };
    }

    if (dateFilterKey === '30d') {
        const start = createDayStart(now);
        start.setDate(start.getDate() - 29);

        return {
            afterDate: start,
            beforeDate: createDayEnd(now),
        };
    }

    if (dateFilterKey === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

        return {
            afterDate: start,
            beforeDate: createDayEnd(now),
        };
    }

    if (dateFilterKey === 'last_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        return {
            afterDate: start,
            beforeDate: end,
        };
    }

    return {
        afterDate: null,
        beforeDate: null,
    };
};

export const DEFAULT_DATE_FILTER_KEY = 'today';

export const resolveDateFilterOptions = () => [
    {
        key: 'today',
        label: resolveOrderLabel('period_today', 'Today'),
    },
    {
        key: '7d',
        label: resolveOrderLabel('period_7d', '7 days'),
    },
    {
        key: '30d',
        label: resolveOrderLabel('period_30d', '30 days'),
    },
    {
        key: 'this_month',
        label: resolveOrderLabel('period_this_month', 'This month'),
    },
    {
        key: 'last_month',
        label: resolveOrderLabel('period_last_month', 'Last month'),
    },
];

export const getDateRange = (dateFilterKey, baseDate = new Date()) => {
    const { afterDate, beforeDate } = resolveDateObjectsRange(dateFilterKey, baseDate);

    return {
        after: afterDate ? formatDateToApi(afterDate) : null,
        before: beforeDate ? formatDateToApi(beforeDate) : null,
    };
};

export const resolveDateRangeSummary = (dateFilterKey, baseDate = new Date()) => {
    const { afterDate, beforeDate } = resolveDateObjectsRange(dateFilterKey, baseDate);

    if (!afterDate || !beforeDate) {
        return '';
    }

    const afterLabel = formatDateLabel(afterDate);
    const beforeLabel = formatDateLabel(beforeDate);

    if (afterLabel === beforeLabel) {
        return afterLabel;
    }

    return `${afterLabel} - ${beforeLabel}`;
};

export const resolveDateFilterTitle = () =>
    resolveOrderLabel('period', 'Period');

export const resolveDateFilterCurrentLabel = () =>
    resolveOrderLabel('current_date', 'Current date');
