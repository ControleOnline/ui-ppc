import { buildOrderProductCards } from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'

export const resolveOrderItemsTotal = (orderProducts, fallbackColor = '') => {
  const cards = buildOrderProductCards(
    Array.isArray(orderProducts) ? orderProducts : [],
    { fallbackColor },
  )

  return cards.reduce((total, card) => {
    const quantity = Number(card?.quantity ?? card?.rootItem?.quantity ?? 0)

    if (Number.isFinite(quantity) && quantity > 0) {
      return total + quantity
    }

    return total + 1
  }, 0)
}
