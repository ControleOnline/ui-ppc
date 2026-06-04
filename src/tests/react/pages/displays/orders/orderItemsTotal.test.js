/* global describe, expect, it */

import { resolveOrderItemsTotal } from '@controleonline/ui-ppc/src/react/pages/displays/orders/orderItemsTotal'

describe('display order items total', () => {
  it('sums only root order item quantities for the KDS ticket header', () => {
    const total = resolveOrderItemsTotal([
      {
        id: 1,
        quantity: 2,
        product: {
          id: 101,
          product: 'Maionese Verde - pote 60ml',
        },
      },
      {
        id: 2,
        quantity: 2,
        product: {
          id: 102,
          product: 'Combo Zetta Gyros',
        },
      },
      {
        id: 3,
        quantity: 1,
        product: {
          id: 103,
          product: 'Queijo Mucarela',
        },
        productGroup: {
          id: 200,
          productGroup: 'Escolha o queijo',
          parentProduct: {
            id: 102,
            product: 'Combo Zetta Gyros',
          },
        },
      },
      {
        id: 4,
        quantity: 1,
        product: {
          id: 104,
          product: 'Batata Frita Media',
        },
      },
      {
        id: 5,
        quantity: 1,
        product: {
          id: 105,
          product: 'Coca-Cola Sem Acucar lata 350 ml',
        },
      },
    ])

    expect(total).toBe(6)
  })
})
