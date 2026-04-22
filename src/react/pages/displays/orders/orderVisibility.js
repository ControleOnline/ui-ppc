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

const isDisplayVisibleOrder = order =>
  getOrderRealStatus(order) === 'open' && getOrderType(order) === 'sale'

module.exports = {
  getOrderRealStatus,
  getOrderType,
  isDisplayVisibleOrder,
}
