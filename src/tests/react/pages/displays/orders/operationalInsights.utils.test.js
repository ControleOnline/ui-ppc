const {
  buildOperationalInsightsSlides,
  extractOperationalInsightPayload,
  extractOperationalInsightsPayload,
} = require('../../../../../react/pages/displays/orders/operationalInsights.utils')

const {afterAll, beforeAll, describe, expect, it} = global

const originalTranslator = global.t

beforeAll(() => {
  global.t = {
    t: (...args) => args.join('.'),
  }
})

afterAll(() => {
  global.t = originalTranslator
})

describe('operationalInsights.utils', () => {
  it('extracts the nested operational insights payload from report summaries', () => {
    expect(
      extractOperationalInsightsPayload({
        summary: {
          report: {
            operationalInsights: {
              totals: {
                orders: 2,
              },
            },
          },
        },
      }),
    ).toEqual({
      totals: {
        orders: 2,
      },
    })
  })

  it('extracts only the selected insight block', () => {
    expect(
      extractOperationalInsightPayload(
        {
          summary: {
            operationalInsights: {
              totals: {
                orders: 4,
                units: 8,
              },
              apps: [
                {
                  label: 'iFood',
                  orders: 2,
                  units: 6,
                },
              ],
            },
          },
        },
        'apps',
      ),
    ).toEqual([
      {
        label: 'iFood',
        orders: 2,
        units: 6,
      },
    ])
  })

  it('builds the TV deck in the expected operational order', () => {
    const slides = buildOperationalInsightsSlides({ periodLabel: 'Hoje' })

    expect(slides.map(slide => slide.key)).toEqual([
      'totals',
      'apps',
      'displays',
      'products',
      'daily',
      'abc',
    ])
    expect(slides[0]).toMatchObject({
      key: 'totals',
      insightKey: 'totals',
      type: 'kpi',
      title: 'display.title.operationalSummary',
      subtitle: 'Hoje',
    })
    expect(slides[1]).toMatchObject({
      key: 'apps',
      insightKey: 'apps',
      type: 'ranking',
      valueKey: 'units',
      secondaryKey: 'orders',
    })
    expect(slides[5]).toMatchObject({
      key: 'abc',
      insightKey: 'abc',
      type: 'abc',
    })
  })
})
