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

const { TvOrderCard } =
  require('../../../../../react/pages/displays/tv')

describe('TvOrderCard', () => {
  beforeEach(() => {
    global.__orderHeaderProps = null
    global.__orderProductsProps = null
    global.__displayDeliveryMapProps = null
    global.__operationalInsightsProps = null
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
            product: 'Alpha Gyros',
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
          borderSoft: '#E2E8F0',
        },
        styles: {
          loadingInlineText: {},
          loadingInlineWrap: {},
          orderAccentBar: {},
          orderCard: {},
          orderCardContent: {},
          productsWrap: {},
        },
        orderStyles: {},
      }),
    )

    expect(global.__orderHeaderProps).toMatchObject({
      order,
      isKds: false,
      showWaitingTime: false,
      metaText: 'ROGÉRIO',
    })

    expect(global.__orderProductsProps).toMatchObject({
      order,
      showDetails: true,
      showDescriptions: true,
      showPricing: true,
      showImages: false,
      showRootQuantityPrefix: true,
      showQueuePresentation: true,
      showHierarchyGuides: true,
    })
  })
})
