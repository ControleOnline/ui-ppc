const normalizeText = value => String(value || '').trim()

const DISPLAY_ORDER_STATUS_FILTERS = new Set([
  'open',
  'pending',
  'closed',
  'canceled',
])

const normalizeStatusFilter = value => {
  const normalized = normalizeText(value).toLowerCase()

  return DISPLAY_ORDER_STATUS_FILTERS.has(normalized)
    ? normalized
    : 'open'
}

const getOrderRealStatus = order => {
  const candidates = [
    order?.status?.realStatus,
    order?.status?.real_status,
    order?.realStatus,
    order?.real_status,
    order?.order?.status?.realStatus,
    order?.order?.status?.real_status,
    order?.order?.realStatus,
    order?.order?.real_status,
  ]

  return normalizeText(
    candidates.find(value => normalizeText(value)),
  ).toLowerCase()
}

const getOrderType = order =>
  normalizeText(order?.orderType).toLowerCase()

const isDisplayVisibleOrder = (order, statusFilter = 'open') => {
  const realStatus = getOrderRealStatus(order)
  const normalizedStatusFilter = normalizeStatusFilter(statusFilter)

  return getOrderType(order) === 'sale' && realStatus === normalizedStatusFilter
}

module.exports = {
  getOrderRealStatus,
  getOrderType,
  isDisplayVisibleOrder,
}
