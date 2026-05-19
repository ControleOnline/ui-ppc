import { normalizeEntityId } from '@controleonline/ui-orders/src/utils/orderState'

export const DISPLAY_ORDERS_PAGE_SIZE = 5

const normalizePageNumber = value => {
  const parsed = Number.parseInt(String(value || '').replace(/\D+/g, ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.member)) return response.member
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

export const extractCollectionTotalItems = response => {
  const parsed = Number(response?.totalItems ?? response?.['hydra:totalItems'] ?? 0)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export const mergeOrdersPage = (pagesByNumber, pageNumber, pageItems) => {
  const targetPageNumber = normalizePageNumber(pageNumber)

  if (!targetPageNumber) {
    return { ...(pagesByNumber || {}) }
  }

  return {
    ...(pagesByNumber || {}),
    [targetPageNumber]: Array.isArray(pageItems) ? pageItems : [],
  }
}

export const getNextOrdersPageNumber = pagesByNumber => {
  const pageNumbers = Object.keys(pagesByNumber || {})
    .map(normalizePageNumber)
    .filter(Boolean)

  if (!pageNumbers.length) {
    return 1
  }

  return Math.max(...pageNumbers) + 1
}

export const flattenOrdersPages = pagesByNumber => {
  const seenOrderIds = new Set()

  return Object.keys(pagesByNumber || {})
    .map(normalizePageNumber)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .flatMap(pageNumber => (Array.isArray(pagesByNumber?.[pageNumber]) ? pagesByNumber[pageNumber] : []))
    .filter(order => {
      const orderId = normalizeEntityId(order)

      if (!orderId || seenOrderIds.has(orderId)) {
        return false
      }

      seenOrderIds.add(orderId)
      return true
    })
}

export const hasMoreOrdersPages = (pagesByNumber, totalItems = 0) => {
  const loadedOrders = flattenOrdersPages(pagesByNumber)
  const normalizedTotalItems = Number(totalItems || 0)

  if (Number.isFinite(normalizedTotalItems) && normalizedTotalItems > 0) {
    return loadedOrders.length < normalizedTotalItems
  }

  const nextPageNumber = getNextOrdersPageNumber(pagesByNumber) - 1
  const lastPageItems = Array.isArray(pagesByNumber?.[nextPageNumber])
    ? pagesByNumber[nextPageNumber]
    : []

  return lastPageItems.length === DISPLAY_ORDERS_PAGE_SIZE
}
