const {jest} = require('@jest/globals')

const {describe, expect, it} = global

jest.mock('@controleonline/ui-orders/src/react/services/marketplaceOrderSummary', () => ({
  buildFood99OrderSummary: jest.fn(() => ({
    customer: {
      name: 'Remote Customer',
    },
  })),
}))

jest.mock('@controleonline/ui-orders/src/react/utils/orderIdentity', () => ({
  resolveMarketplaceAppLabel: jest.fn(() => 'Marketplace'),
  resolveMarketplaceOrderCode: jest.fn(() => 'MP-123'),
  resolveOrderIdentity: jest.fn(() => ({
    externalId: 'EXT-123',
    externalLabel: 'External',
    internalId: 'INT-123',
  })),
}))

const {
  resolveDisplayTicketSummary,
} = require('@controleonline/ui-ppc/src/react/pages/displays/products/displayPrintRules')

describe('displayPrintRules', () => {
  it('uses only order.client.name as the client label', () => {
    const summary = resolveDisplayTicketSummary({
      client: {
        alias: 'Alias antigo',
        name: 'Cliente Principal',
      },
      customer: {
        name: 'Outro Nome',
      },
      customerName: 'Fallback Indevido',
      person: {
        name: 'Pessoa Indevida',
      },
    })

    expect(summary.clientName).toBe('Cliente Principal')
  })

  it('does not fall back to other customer fields when client.name is absent', () => {
    const summary = resolveDisplayTicketSummary({
      client: {
        alias: 'Alias antigo',
      },
      customer: {
        name: 'Outro Nome',
      },
      customerName: 'Fallback Indevido',
      person: {
        name: 'Pessoa Indevida',
      },
    })

    expect(summary.clientName).toBe('')
  })
})
