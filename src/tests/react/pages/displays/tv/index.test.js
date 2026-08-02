const { jest } = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const { describe, beforeEach, expect, it } = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name =>
    function MockComponent(props) {
      return React.createElement(name.toLowerCase(), null, props.children)
    }

  const Dimensions = {
    get: () => ({
      height: 768,
      width: 1366,
    }),
  }

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    Dimensions,
    FlatList: createComponent('FlatList'),
    StyleSheet: {
      create: styles => styles,
    },
    Text: createComponent('Text'),
    View: createComponent('View'),
    useWindowDimensions: () => ({
      fontScale: 1,
      height: 768,
      scale: 1,
      width: 1366,
    }),
  }
})

jest.mock('react-native-paper', () => {
  const React = require('react')
  const Card = function MockCard(props) {
    return React.createElement('card', props, props.children)
  }
  Card.Content = function MockCardContent(props) {
    return React.createElement('card-content', props, props.children)
  }

  return { Card }
})

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => false,
}))

jest.mock('@store', () => ({
  useStore: () => ({
    getters: {
      currentCompany: { id: 3 },
    },
  }),
}))

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

jest.mock('@controleonline/ui-ppc/src/react/theme/displayTheme', () => ({
  useDisplayTheme: () => ({
    ppcColors: {
      accentInfo: '#0EA5E9',
      appBg: '#FFFFFF',
      border: '#CBD5E1',
      borderSoft: '#E2E8F0',
      cardBg: '#FFFFFF',
      cardBgSoft: '#F8FAFC',
      panelBg: '#F8FAFC',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
    },
  }),
}))

jest.mock(
  '@controleonline/ui-ppc/src/react/pages/displays/orders/DisplayDeliveryMap',
  () => function MockDisplayDeliveryMap(props) {
    global.__displayDeliveryMapProps = props
    return null
  },
)

jest.mock(
  '@controleonline/ui-ppc/src/react/pages/displays/orders/OperationalInsightsDock',
  () => function MockOperationalInsightsDock(props) {
    global.__operationalInsightsProps = props
    return null
  },
)

jest.mock(
  '@controleonline/ui-orders/src/react/components/OrderHeader',
  () =>
    function MockOrderHeader(props) {
      global.__orderHeaderProps = props
      return React.createElement('order-header')
    },
)

jest.mock(
  '@controleonline/ui-orders/src/react/components/OrderProducts',
  () =>
    function MockOrderProducts(props) {
      global.__orderProductsProps = props
      return React.createElement('order-products')
    },
)

const { api } = require('@controleonline/ui-common/src/api')
const {
  TvOrderCard,
  countOperationalOrderItems,
  fetchTrackingOrdersPage,
  isTrackingMessageForCompany,
} =
  require('../../../../../react/pages/displays/tv')

describe('TvOrderCard', () => {
  beforeEach(() => {
    api.fetch.mockReset()
    global.__orderHeaderProps = null
    global.__orderProductsProps = null
    global.__displayDeliveryMapProps = null
    global.__operationalInsightsProps = null
  })

  it('loads the complete Tracking page through one collection request', async () => {
    api.fetch.mockResolvedValueOnce({member: []})
    const query = {provider: 3, page: 1}

    await expect(fetchTrackingOrdersPage(query)).resolves.toEqual({member: []})
    expect(api.fetch).toHaveBeenCalledTimes(1)
    expect(api.fetch).toHaveBeenCalledWith('/orders-tracking', {params: query})
  })

  it('accepts realtime mutations only for the current company when identified', () => {
    expect(isTrackingMessageForCompany({company: '/people/3'}, 3)).toBe(true)
    expect(isTrackingMessageForCompany({company: {id: 4}}, 3)).toBe(false)
    expect(isTrackingMessageForCompany({store: 'order_products'}, 3)).toBe(true)
  })

  it('renders full order details for TV cards', () => {
    const order = {
      id: 72133,
      client: { name: 'ROGÉRIO' },
      orderProducts: [
        {
          id: 1,
          quantity: 1,
          product: {
            id: 10,
            product: 'Alpha Produto Exemplo',
          },
        },
      ],
      status: {
        color: '#16A34A',
        status: 'paid',
      },
    }

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(TvOrderCard, {
        order,
        ppcColors: {
          accentInfo: '#0EA5E9',
          cardBg: '#FFFFFF',
          border: '#CBD5E1',
          borderSoft: '#E2E8F0',
        },
        styles: {
          incorporatedProductText: {
            fontWeight: '500',
          },
          loadingInlineText: {},
          loadingInlineWrap: {},
          orderAccentBar: {},
          orderCard: {},
          orderCardContent: {},
          orderNumberText: {
            fontSize: 18,
            lineHeight: 22,
          },
          productsWrap: {},
        },
        orderStyles: {},
      }),
    )

    expect(global.__orderHeaderProps).toMatchObject({
      order,
      isKds: false,
      showPricing: false,
      showWaitingTime: false,
      metaText: 'ROGÉRIO',
      orderIdStyle: {
        fontSize: 18,
        lineHeight: 22,
      },
      itemCount: 1,
    })

    expect(global.__orderProductsProps).toMatchObject({
      order,
      showDetails: true,
      showDescriptions: false,
      showPricing: false,
      showImages: false,
      showRootQuantityPrefix: true,
      showQueuePresentation: true,
      showHierarchyGuides: true,
      showRootStatusMarker: false,
      showGroupStatusMarker: false,
      hierarchyGuideColor: '#CBD5E1',
      queueIdentificationMode: 'short_label',
      statusIndicatorMode: 'bullet',
      showUnitQuantity: false,
      showGroupNames: false,
      showConferenceCheck: true,
      compact: true,
    })
    expect(global.__orderProductsProps.productCards).toHaveLength(1)
    expect(global.__orderProductsProps.productCards[0]).toMatchObject({
      name: 'Alpha Produto Exemplo',
      parentCardKey: '',
      originGroup: null,
      quantity: 1,
    })
    expect(global.__orderProductsProps.styles.groupItemText).toEqual([
      undefined,
      {fontWeight: '500'},
    ])
  })

  it('counts only operational cards and respects their quantities', () => {
    const orderProducts = [
      {
        id: 1,
        quantity: 1,
        product: {id: 10, product: 'Combo'},
        orderProductComponents: [
          {
            id: 11,
            quantity: 1,
            product: {id: 110, product: 'Queijo incorporado'},
            showInParentQueue: true,
            productGroup: {
              id: 100,
              productGroup: 'Escolha seu queijo',
            },
          },
          {
            id: 12,
            quantity: 2,
            product: {id: 120, product: 'Batata operacional'},
            showInParentQueue: false,
            productGroup: {
              id: 200,
              productGroup: 'Escolha sua batata',
            },
          },
        ],
      },
      {
        id: 12,
        quantity: 2,
        product: {id: 120, product: 'Batata operacional'},
        showInParentQueue: false,
        orderProduct: '/order_products/1',
        productGroup: {
          id: 200,
          productGroup: 'Escolha sua batata',
        },
      },
      {
        id: 20,
        quantity: 1,
        product: {id: 200, product: 'Produto avulso'},
      },
    ]

    expect(countOperationalOrderItems(orderProducts)).toBe(4)
  })
})
