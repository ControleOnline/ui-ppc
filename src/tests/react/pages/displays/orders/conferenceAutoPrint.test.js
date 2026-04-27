const {
  appendPendingConferenceAutoPrintJob,
  buildConferenceAutoPrintMessageFingerprint,
  decodeOrderOtherInformations,
  isConferenceOrderPrinted,
  isRelevantConferenceAutoPrintMessage,
  removePendingConferenceAutoPrintJob,
} = require('../../../../../react/pages/displays/orders/conferenceAutoPrint')

const { describe, expect, it } = global

describe('conferenceAutoPrint helpers', () => {
  it('detects websocket messages that should trigger auto conference print', () => {
    expect(
      isRelevantConferenceAutoPrintMessage({
        store: 'orders',
        event: 'order.created',
        realStatus: 'open',
        order: 123,
        alertSound: true,
      }),
    ).toBe(true)

    expect(
      isRelevantConferenceAutoPrintMessage({
        store: 'orders',
        event: 'order.updated',
        realStatus: 'open',
        order: 123,
        alertSound: true,
      }),
    ).toBe(false)
  })

  it('reads the conference print mark from otherInformations', () => {
    expect(
      isConferenceOrderPrinted({
        otherInformations: JSON.stringify({
          conference_print: {
            printed: true,
            printed_at: '2026-04-27T12:00:00+00:00',
          },
        }),
      }),
    ).toBe(true)

    expect(
      decodeOrderOtherInformations({
        otherInformations: '{"conference_print":{"printed":false}}',
      }),
    ).toEqual({
      conference_print: {
        printed: false,
      },
    })
  })

  it('deduplicates pending jobs and removes settled entries', () => {
    expect(
      appendPendingConferenceAutoPrintJob(['12'], '/orders/12'),
    ).toEqual(['12'])

    expect(
      appendPendingConferenceAutoPrintJob(['12'], '/orders/15'),
    ).toEqual(['12', '15'])

    expect(
      removePendingConferenceAutoPrintJob(['12', '15'], '/orders/12'),
    ).toEqual(['15'])
  })

  it('builds stable fingerprints for repeated order created events', () => {
    expect(
      buildConferenceAutoPrintMessageFingerprint({
        store: 'orders',
        event: 'order.created',
        company: 99,
        order: 10,
        sentAt: '2026-04-27T09:00:00+00:00',
        alertSound: true,
      }),
    ).toBe(
      buildConferenceAutoPrintMessageFingerprint({
        store: 'orders',
        event: 'order.created',
        company: '/people/99',
        order: '/orders/10',
        sentAt: '2026-04-27T09:00:00+00:00',
        alertSound: 1,
      }),
    )
  })
})
