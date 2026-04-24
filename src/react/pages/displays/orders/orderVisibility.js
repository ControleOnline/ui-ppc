const normalizeText = value => String(value || '').trim()

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

const getOrderStatus = order => {
  const candidates = [
    order?.status?.status,
    order?.order?.status?.status,
  ]

  return normalizeText(
    candidates.find(value => normalizeText(value)),
  ).toLowerCase()
}

const isDisplayVisibleOrder = order => {
  const realStatus = getOrderRealStatus(order)
  const status = getOrderStatus(order)

  return getOrderType(order) === 'sale' && (
    realStatus === 'open' ||
    (realStatus === 'pending' && status === 'ready')
  )
}

module.exports = {
  getOrderRealStatus,
  getOrderStatus,
  getOrderType,
  isDisplayVisibleOrder,
}
