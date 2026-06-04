export const resolveTvTicketGridSlotCount = orderCount => {
  const normalizedCount = Math.max(0, Number(orderCount || 0))

  if (normalizedCount <= 4) {
    return 4
  }

  return Math.max(8, normalizedCount)
}

export const resolveTvTicketGridColumns = () => 4

export const buildTvTicketGridSlots = orders => {
  const visibleOrders = Array.isArray(orders) ? orders : []
  const slotCount = resolveTvTicketGridSlotCount(visibleOrders.length)

  return Array.from({length: slotCount}, (_, index) => ({
    key: visibleOrders[index]?.id
      ? `order-${visibleOrders[index].id}`
      : `empty-tv-ticket-${index}`,
    order: visibleOrders[index] || null,
    slotIndex: index,
  }))
}
