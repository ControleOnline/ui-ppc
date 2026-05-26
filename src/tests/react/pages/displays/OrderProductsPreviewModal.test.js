const {jest} = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const {describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name =>
    function MockComponent(props) {
      return React.createElement(name.toLowerCase(), null, props.children)
    }

  return {
    Modal: createComponent('Modal'),
    ScrollView: createComponent('ScrollView'),
    StyleSheet: {
      create: styles => styles,
    },
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0}),
}))

jest.mock('@controleonline/ui-ppc/src/react/theme/ppcTheme', () => ({
  usePpcTheme: () => ({
    ppcColors: {
      appBg: '#FFFFFF',
      border: '#E2E8F0',
      borderSoft: '#E2E8F0',
      modalBg: '#FFFFFF',
    },
  }),
}))

jest.mock(
  '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar',
  () =>
    function MockOrderStackedTopBar(props) {
      global.__orderStackedTopBarProps = props
      return null
    },
)

jest.mock(
  '@controleonline/ui-orders/src/react/pages/orders/sales/OrderItemsTab',
  () =>
    function MockOrderItemsTab(props) {
      global.__orderItemsTabProps = props
      return null
    },
)

const OrderProductsPreviewModal =
  require('../../../../react/pages/displays/OrderProductsPreviewModal').default

describe('OrderProductsPreviewModal', () => {
  it('opens the order-details style popup with whole-order print and detailed items', () => {
    global.__orderStackedTopBarProps = null
    global.__orderItemsTabProps = null

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderProductsPreviewModal, {
        visible: true,
        display: {id: 7},
        displayId: 7,
        order: {
          id: 812,
          client: {name: 'Cliente Exemplo'},
          orderProducts: [
            {
              id: 1,
              quantity: 3,
              product: {id: 100, product: 'Combo Exemplo'},
            },
          ],
        },
        onClose: jest.fn(),
      }),
    )

    expect(global.__orderStackedTopBarProps).toMatchObject({
      order: {
        id: 812,
        client: {name: 'Cliente Exemplo'},
        orderProducts: [
          {
            id: 1,
            quantity: 3,
            product: {id: 100, product: 'Combo Exemplo'},
          },
        ],
      },
      isKds: true,
      showBackButton: true,
      backIconName: 'close',
      buttons: ['print'],
      printJob: {
        type: 'order',
        orderId: '812',
      },
      printerSelection: {
        enabled: true,
        context: 'display',
        display: {id: 7},
        displayId: 7,
      },
    })

    expect(global.__orderItemsTabProps).toMatchObject({
      routeOrderId: '812',
      showPricing: false,
      showRootQuantityPrefix: true,
      showQueuePresentation: true,
    })
    expect(global.__orderItemsTabProps.order).toBeUndefined()
    expect(global.__orderItemsTabProps.orderProducts).toBeUndefined()
    expect(global.__orderItemsTabProps.variant).toBeUndefined()

    expect(markup).not.toContain('null')
  })
})
