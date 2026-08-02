import {getDateRange} from '@controleonline/ui-common/src/react/utils/dateRangeFilter'

const normalizeText = value => String(value ?? '').trim()

export const DISPLAY_ORDER_STATUS_FILTERS = ['all', 'open', 'pending', 'closed', 'canceled']
export const DISPLAY_ORDER_APP_FILTERS = ['all', 'Food99', 'iFood', 'SHOP', 'POS']

export const DEFAULT_DISPLAY_ORDER_STATUS_FILTER = 'open'
export const DEFAULT_DISPLAY_ORDER_APP_FILTER = 'all'

export const resolveDisplayOrderStatusFilter = value => {
  const normalized = normalizeText(value).toLowerCase()

  return DISPLAY_ORDER_STATUS_FILTERS.includes(normalized)
    ? normalized
    : DEFAULT_DISPLAY_ORDER_STATUS_FILTER
}

export const resolveDisplayOrderAppFilter = value => {
  const normalized = normalizeText(value)

  if (!normalized || normalized.toLowerCase() === 'all') {
    return DEFAULT_DISPLAY_ORDER_APP_FILTER
  }

  return DISPLAY_ORDER_APP_FILTERS.includes(normalized)
    ? normalized
    : DEFAULT_DISPLAY_ORDER_APP_FILTER
}

export const resolveDisplayOrderDateRange = (
  dateFilterKey,
  customDateRange,
) =>
  getDateRange(dateFilterKey || 'today', customDateRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  })

export const buildDisplayOrdersQueueQuery = ({
  companyId = null,
  dateFilterKey = 'today',
  customDateRange = null,
  statusFilter = DEFAULT_DISPLAY_ORDER_STATUS_FILTER,
  appFilter = DEFAULT_DISPLAY_ORDER_APP_FILTER,
  page = 1,
} = {}) => {
  if (!companyId) {
    return null
  }

  const normalizedStatus = resolveDisplayOrderStatusFilter(statusFilter)
  const normalizedApp = resolveDisplayOrderAppFilter(appFilter)
  const dateRange = resolveDisplayOrderDateRange(dateFilterKey, customDateRange)

  const query = {
    provider: companyId,
    orderType: 'sale',
    'order[alterDate]': 'asc',
    page,
  }

  if (normalizedStatus !== 'all') {
    query.status = {
      realStatus: [normalizedStatus],
    }
  }

  if (normalizedApp !== DEFAULT_DISPLAY_ORDER_APP_FILTER) {
    query.app = normalizedApp
  }

  if (dateRange?.after) {
    query['alterDate[after]'] = dateRange.after
  }

  if (dateRange?.before) {
    query['alterDate[before]'] = dateRange.before
  }

  return query
}
