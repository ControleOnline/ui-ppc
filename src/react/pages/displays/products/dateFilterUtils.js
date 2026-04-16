const pad2 = value => String(value).padStart(2, '0');
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatDateToApi = date =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

const resolveOrderLabel = key => global.t?.t('orders', 'label', key);

const createDayStart = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const createDayEnd = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const formatDateLabel = date => date.toLocaleDateString('pt-BR');

export const parseDateInput = value => {
    const normalizedValue = String(value || '').trim();

    if (!DATE_INPUT_PATTERN.test(normalizedValue)) {
        return null;
    }

    const [year, month, day] = normalizedValue.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const validateCustomDateRange = (fromInput, toInput) => {
    const fromValue = String(fromInput || '').trim();
    const toValue = String(toInput || '').trim();
    const fromDate = fromValue ? parseDateInput(fromValue) : null;
    const toDate = toValue ? parseDateInput(toValue) : null;

    if ((fromValue && !fromDate) || (toValue && !toDate)) {
        return global.t?.t('orders', 'validation', 'invalid_date_format');
    }

    if (fromDate && toDate && fromDate > toDate) {
        return global.t?.t('orders', 'validation', 'invalid_date_range');
    }

    return '';
};

const resolveDateObjectsRange = (dateFilterKey, customRange = null, baseDate = new Date()) => {
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

    if (dateFilterKey === 'custom') {
        const afterDate = parseDateInput(customRange?.from);
        const beforeDate = parseDateInput(customRange?.to);

        if (afterDate) {
            afterDate.setHours(0, 0, 0, 0);
        }

        if (beforeDate) {
            beforeDate.setHours(23, 59, 59, 999);
        }

        return {
            afterDate,
            beforeDate,
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
        key: 'all',
        label: resolveOrderLabel('period_all'),
    },
    {
        key: 'today',
        label: resolveOrderLabel('period_today'),
    },
    {
        key: '7d',
        label: resolveOrderLabel('period_7d'),
    },
    {
        key: '30d',
        label: resolveOrderLabel('period_30d'),
    },
    {
        key: 'this_month',
        label: resolveOrderLabel('period_this_month'),
    },
    {
        key: 'last_month',
        label: resolveOrderLabel('period_last_month'),
    },
    {
        key: 'custom',
        label: resolveOrderLabel('period_custom'),
    },
];

export const getDateRange = (
    dateFilterKey,
    customRange = null,
    baseDate = new Date(),
) => {
    const { afterDate, beforeDate } = resolveDateObjectsRange(
        dateFilterKey,
        customRange,
        baseDate,
    );

    return {
        after: afterDate ? formatDateToApi(afterDate) : null,
        before: beforeDate ? formatDateToApi(beforeDate) : null,
    };
};

export const resolveDateRangeSummary = (
    dateFilterKey,
    customRange = null,
    baseDate = new Date(),
) => {
    const { afterDate, beforeDate } = resolveDateObjectsRange(
        dateFilterKey,
        customRange,
        baseDate,
    );

    if (!afterDate || !beforeDate) {
        return afterDate ? formatDateLabel(afterDate) : beforeDate ? formatDateLabel(beforeDate) : '';
    }

    const afterLabel = formatDateLabel(afterDate);
    const beforeLabel = formatDateLabel(beforeDate);

    if (afterLabel === beforeLabel) {
        return afterLabel;
    }

    return `${afterLabel} - ${beforeLabel}`;
};

export const resolveDateFilterTitle = () =>
    resolveOrderLabel('period');

export const resolveDateFilterCurrentLabel = () =>
    resolveOrderLabel('current_date');
