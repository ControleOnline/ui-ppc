const {jest} = require('@jest/globals')

const {
  buildDisplayOrdersQueueQuery,
  resolveDisplayOrderAppFilter,
  resolveDisplayOrderStatusFilter,
} = require('../../../../../react/pages/displays/orders/ordersFilters')
const {describe, expect, it, beforeEach, afterEach} = global

describe('ordersFilters', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 4, 31, 13, 45, 12))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('normalizes invalid status and app filters to their defaults', () => {
    expect(resolveDisplayOrderStatusFilter('all')).toBe('all')
    expect(resolveDisplayOrderStatusFilter()).toBe('open')
    expect(resolveDisplayOrderStatusFilter('invalid')).toBe('open')
    expect(resolveDisplayOrderAppFilter()).toBe('all')
    expect(resolveDisplayOrderAppFilter('invalid')).toBe('all')
  })

  it('builds the default queue query for today with open status and no app filter', () => {
    const query = buildDisplayOrdersQueueQuery({
      companyId: 22,
    })

    expect(query).toMatchObject({
      provider: 22,
      orderType: 'sale',
      status: {
        realStatus: ['open'],
      },
      page: 1,
      'order[alterDate]': 'asc',
      'alterDate[after]': '2026-05-31 00:00:00',
      'alterDate[before]': '2026-05-31 13:45:12',
    })
    expect(query.app).toBeUndefined()
  })

  it('includes the selected app and status filters when provided', () => {
    const query = buildDisplayOrdersQueueQuery({
      companyId: 22,
      dateFilterKey: 'today',
      statusFilter: 'closed',
      appFilter: 'iFood',
      page: 3,
    })

    expect(query).toMatchObject({
      provider: 22,
      orderType: 'sale',
      status: {
        realStatus: ['closed'],
      },
      app: 'iFood',
      page: 3,
      'order[alterDate]': 'asc',
    })
  })

  it('omits the status constraint when all statuses are selected', () => {
    const query = buildDisplayOrdersQueueQuery({
      companyId: 22,
      statusFilter: 'all',
    })

    expect(query).toMatchObject({
      provider: 22,
      orderType: 'sale',
      page: 1,
      'order[alterDate]': 'asc',
    })
    expect(query.status).toBeUndefined()
  })
})
